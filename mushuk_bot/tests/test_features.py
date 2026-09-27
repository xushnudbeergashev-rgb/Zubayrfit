from __future__ import annotations

from datetime import datetime, timedelta, timezone
import sqlite3
from types import SimpleNamespace
from typing import Any

import pytest
from aiogram import Router

from cat_bot.captions import channel_caption
from cat_bot.config import Settings
from cat_bot.database import Database, ReceiptAlreadyUsed, to_iso
from cat_bot.handlers import (
    BREEDS,
    answer_question,
    breed_keyboard,
    main_menu,
    register_handlers,
    spam_limit_message,
    submit_for_review,
)
from cat_bot.importer import parse_export, save
from cat_bot.lifecycle import run_lifecycle_check
from cat_bot.moderation import Moderator, local_text_check

from test_moderation import (
    ADMIN_ID,
    CHANNEL_ID,
    FakeBot,
    FakeCallback,
    FakeMessage,
    create_listing,
    run,
    user,
)


OWNER_ID = 100


@pytest.fixture
def settings() -> Settings:
    return Settings(
        bot_token="test-token",
        channel_id=CHANNEL_ID,
        db_path=":memory:",
        openai_api_key=None,
        admin_user_ids=frozenset({ADMIN_ID}),
    )


@pytest.fixture
def database(tmp_path) -> Database:
    db = Database(str(tmp_path / "cats.db"))
    db.upsert_user(OWNER_ID, "owner", "Cat Owner")
    yield db
    db.close()


def listing_data(**overrides: Any) -> dict[str, Any]:
    data = {
        "listing_type": "Sotiladi",
        "region": "Samarqand",
        "breed": "Siam",
        "age": "3 oylik",
        "gender": "Erkak",
        "price": "500 000 so‘m",
        "description": "Juda o‘ynoqi",
        "contact": "+998 90 123 45 67",
        "photo_ids": ["cat-1", "cat-2"],
        "photo_check": "passed",
    }
    data.update(overrides)
    return data


def callback_handler(database: Database, settings: Settings, name: str):
    router = Router()
    register_handlers(router, database, settings)
    return next(
        handler.callback
        for handler in router.callback_query.handlers
        if handler.callback.__name__ == name
    )


# ---------- 1. Menu and admin contact ----------


def test_main_menu_has_exactly_three_sections() -> None:
    labels = [button.text for row in main_menu().keyboard for button in row]
    assert labels == ["📢 E'lon berish", "🔍 Mushuk qidirish", "❓ Savol-Javob (AI)"]


def test_admin_contact_only_when_asked(settings: Settings) -> None:
    assert "@zby_r" in run(answer_question("Admin kim?", settings))
    assert "@zby_r" in run(answer_question("Admin bilan bog'lanish", settings))
    assert "@zby_r" not in run(answer_question("E'lon qanday beriladi?", settings))
    assert "@zby_r" not in run(answer_question("Salom", settings))


# ---------- 2. Moderation ----------


def test_breed_is_chosen_from_fixed_buttons() -> None:
    buttons = [button for row in breed_keyboard().inline_keyboard for button in row]
    assert [button.text for button in buttons] == list(BREEDS)
    assert BREEDS == ("Siam", "Meykun", "Boshqa/Oddiy", "Zotdor emas")


@pytest.mark.parametrize(
    "text, reason",
    [
        ("Juda chiroyli, jalab", "profanity"),
        ("Сука", "profanity"),
        ("Arzon kurslar https://example.com", "advertising"),
        ("Kanalga obuna bo'ling t.me/spam", "advertising"),
        ("Bizning @reklama_kanal", "advertising"),
    ],
)
def test_local_text_rules_reject_abuse_and_ads(text: str, reason: str) -> None:
    verdict = local_text_check(text)
    assert verdict.allowed is False
    assert verdict.reason == reason


def test_local_text_rules_allow_normal_text() -> None:
    assert local_text_check("Juda yoqimli, emlangan, 500 000 so'm").allowed is True


def test_openai_moderation_flag_rejects_text(monkeypatch) -> None:
    moderator = Moderator("key")

    async def fake_post(path, payload, timeout=15):
        assert path == "/moderations"
        return {"results": [{"flagged": True}]}

    monkeypatch.setattr(moderator, "_post", fake_post)
    verdict = run(moderator.check_text("clean looking text"))
    assert (verdict.allowed, verdict.reason) == (False, "openai_moderation")


@pytest.mark.parametrize(
    "content, expected",
    [('{"cat": true}', True), ('{"cat": false}', False), ("nonsense", None)],
)
def test_vision_check_parses_answer(monkeypatch, content: str, expected) -> None:
    moderator = Moderator("key")

    async def fake_post(path, payload, timeout=15):
        assert payload["model"] == "gpt-4o"
        image = payload["messages"][0]["content"][1]["image_url"]["url"]
        assert image.startswith("data:image/jpeg;base64,")
        return {"choices": [{"message": {"content": content}}]}

    monkeypatch.setattr(moderator, "_post", fake_post)
    assert run(moderator.is_cat_photo(b"jpeg-bytes")) is expected


def test_vision_check_skipped_without_key() -> None:
    assert run(Moderator(None).is_cat_photo(b"jpeg-bytes")) is None


# ---------- 3. Payments, anti-spam and admin review ----------


def test_receipt_cannot_be_reused(database: Database) -> None:
    data = listing_data()
    fields = {key: data[key] for key in data if key != "photo_check"}
    database.create_listing(
        user_id=OWNER_ID, status="pending", payment_receipt_unique_id="rcpt-1", **fields
    )
    assert database.receipt_used("rcpt-1") is True
    with pytest.raises(ReceiptAlreadyUsed):
        database.create_listing(
            user_id=OWNER_ID,
            status="pending",
            payment_receipt_unique_id="rcpt-1",
            **fields,
        )


def test_spam_limits(database: Database, settings: Settings) -> None:
    bot = FakeBot()
    assert spam_limit_message(database, OWNER_ID) is None
    for _ in range(2):
        run(submit_for_review(bot, database, settings, OWNER_ID, listing_data()))
    assert "kutilayotgan" in spam_limit_message(database, OWNER_ID)


def test_paid_listing_goes_to_admin_with_receipt(
    database: Database, settings: Settings
) -> None:
    bot = FakeBot()
    listing_id = run(
        submit_for_review(
            bot, database, settings, OWNER_ID, listing_data(),
            receipt_file_id="receipt-file", receipt_unique_id="receipt-unique",
        )
    )
    assert database.get_listing(listing_id)["status"] == "pending"
    assert bot.sent_media_groups[0]["chat_id"] == ADMIN_ID
    receipt = bot.sent_photos[0]
    assert receipt["photo"] == "receipt-file"
    assert "7 000 so‘m" in receipt["caption"]
    buttons = receipt["reply_markup"].inline_keyboard[0]
    assert [b.text for b in buttons] == ["🟢 Tasdiqlash", "🔴 Rad etish"]
    assert buttons[0].callback_data == f"review:approve:{listing_id}"


def test_free_listing_goes_to_admin_without_receipt(
    database: Database, settings: Settings
) -> None:
    bot = FakeBot()
    run(
        submit_for_review(
            bot, database, settings, OWNER_ID,
            listing_data(listing_type="Hadyaga", price="Hadyaga / Bepul"),
        )
    )
    assert bot.sent_photos == []
    assert "Bepul e'lon" in bot.sent_messages[0]["text"]


def test_admin_approval_publishes_with_footer(
    database: Database, settings: Settings
) -> None:
    bot = FakeBot(sent_message_ids=[301, 302])
    listing_id = run(submit_for_review(bot, database, settings, OWNER_ID, listing_data()))
    review = callback_handler(database, settings, "review_listing")

    intruder = FakeCallback(user(999), f"review:approve:{listing_id}", FakeMessage())
    run(review(intruder, bot))
    assert database.get_listing(listing_id)["status"] == "pending"

    callback = FakeCallback(user(ADMIN_ID), f"review:approve:{listing_id}", FakeMessage())
    callback.message.edit_reply_markup = _noop
    run(review(callback, bot))

    listing = database.get_listing(listing_id)
    assert listing["status"] == "active"
    assert listing["channel_message_ids"] == [301, 302]
    channel_post = bot.sent_media_groups[-1]
    assert channel_post["chat_id"] == CHANNEL_ID
    caption = channel_post["media"][0].caption
    assert caption.rstrip().endswith(
        "📢 Kanalimiz: @mushuklar_bozori\n"
        "🤖 E'lon berish yoki mushuklarni ko‘rish uchun botimizga yozing: @mushuk_bot"
    )
    owner_dm = bot.sent_messages[-1]
    assert owner_dm["chat_id"] == OWNER_ID
    assert "tasdiqlandi" in owner_dm["text"]

    again = FakeCallback(user(ADMIN_ID), f"review:approve:{listing_id}", FakeMessage())
    run(review(again, bot))
    assert again.answers[-1][0] == ("Bu e'lon allaqachon ko‘rib chiqilgan.",)


def test_admin_rejection_notifies_owner(database: Database, settings: Settings) -> None:
    bot = FakeBot()
    listing_id = run(submit_for_review(bot, database, settings, OWNER_ID, listing_data()))
    callback = FakeCallback(user(ADMIN_ID), f"review:reject:{listing_id}", FakeMessage())
    callback.message.edit_reply_markup = _noop
    run(callback_handler(database, settings, "review_listing")(callback, bot))
    assert database.get_listing(listing_id)["status"] == "rejected"
    assert "rad etildi" in bot.sent_messages[-1]["text"]
    assert bot.sent_messages[-1]["chat_id"] == OWNER_ID


async def _noop(**kwargs: Any) -> None:
    return None


# ---------- 5. Sold / given and lifecycle ----------


def active_sale_listing(database: Database) -> int:
    data = listing_data()
    fields = {key: data[key] for key in data if key != "photo_check"}
    return database.create_listing(
        user_id=OWNER_ID,
        status="active",
        channel_message_ids=[501, 502],
        post_link="https://t.me/cats_channel/501",
        **fields,
    )


class EditableMessage(FakeMessage):
    async def edit_text(self, text: str, **kwargs: Any) -> None:
        self.answers.append(((text,), kwargs))


def test_owner_marks_sold_strips_contacts_and_announces(
    database: Database, settings: Settings
) -> None:
    listing_id = active_sale_listing(database)
    bot = FakeBot()
    handler = callback_handler(database, settings, "owner_mark_done")

    stranger = FakeCallback(user(999), f"owner:done:{listing_id}", EditableMessage())
    run(handler(stranger, bot))
    assert database.get_listing(listing_id)["status"] == "active"

    callback = FakeCallback(user(OWNER_ID), f"owner:done:{listing_id}", EditableMessage())
    run(handler(callback, bot))

    assert database.get_listing(listing_id)["status"] == "sold"
    edited = bot.edited_captions[0]
    assert edited["message_id"] == 501
    assert edited["caption"].startswith("✅ <b>SOTILDI</b>")
    assert "+998" not in edited["caption"]
    assert "Aloqa" not in edited["caption"]
    notice = bot.sent_messages[-1]
    assert notice["chat_id"] == CHANNEL_ID
    assert "SOTILDI" in notice["text"]


def test_lifecycle_asks_after_30_days_then_closes(
    database: Database, settings: Settings
) -> None:
    listing_id = active_sale_listing(database)
    now = datetime.now(timezone.utc)
    database.connection.execute(
        "UPDATE listings SET active_since = ? WHERE id = ?",
        (to_iso(now - timedelta(days=31)), listing_id),
    )
    database.connection.commit()
    bot = FakeBot()

    assert run(run_lifecycle_check(bot, database, settings, now)) == {"asked": 1, "closed": 0}
    question = bot.sent_messages[-1]
    assert question["chat_id"] == OWNER_ID
    assert question["reply_markup"].inline_keyboard[1][0].callback_data == (
        f"renew:no:{listing_id}"
    )
    # Nothing new on the next run before the grace period ends.
    assert run(run_lifecycle_check(bot, database, settings, now + timedelta(days=1))) == {
        "asked": 0, "closed": 0,
    }

    result = run(run_lifecycle_check(bot, database, settings, now + timedelta(days=4)))
    assert result == {"asked": 0, "closed": 1}
    assert database.get_listing(listing_id)["status"] == "expired"
    assert bot.edited_captions[-1]["caption"].startswith("✅ <b>SOTILDI</b>")
    assert "+998" not in bot.edited_captions[-1]["caption"]


def test_renewal_yes_keeps_listing_active(database: Database, settings: Settings) -> None:
    listing_id = active_sale_listing(database)
    database.mark_renewal_asked(listing_id)
    callback = FakeCallback(user(OWNER_ID), f"renew:yes:{listing_id}", EditableMessage())
    run(callback_handler(database, settings, "owner_renewal_answer")(callback, FakeBot()))
    listing = database.get_listing(listing_id)
    assert listing["status"] == "active"
    assert listing["renewal_asked_at"] is None


def test_renewal_no_closes_listing(database: Database, settings: Settings) -> None:
    listing_id = active_sale_listing(database)
    bot = FakeBot()
    callback = FakeCallback(user(OWNER_ID), f"renew:no:{listing_id}", EditableMessage())
    run(callback_handler(database, settings, "owner_renewal_answer")(callback, bot))
    assert database.get_listing(listing_id)["status"] == "expired"
    assert "Aloqa" not in bot.edited_captions[-1]["caption"]


# ---------- Schema migration ----------


def test_old_database_is_migrated(tmp_path) -> None:
    path = tmp_path / "old.db"
    connection = sqlite3.connect(path)
    connection.executescript(
        """
        CREATE TABLE users (telegram_id INTEGER PRIMARY KEY, username TEXT,
            full_name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        INSERT INTO users VALUES (100, 'owner', 'Owner', 'x', 'x');
        CREATE TABLE listings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(telegram_id),
            listing_type TEXT NOT NULL CHECK (listing_type IN ('Hadyaga', 'Sotiladi')),
            region TEXT NOT NULL, breed TEXT NOT NULL, age TEXT NOT NULL,
            gender TEXT NOT NULL, price TEXT NOT NULL, contact TEXT NOT NULL,
            photo_ids TEXT NOT NULL, channel_message_id INTEGER,
            channel_message_ids TEXT, post_link TEXT,
            status TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'hidden', 'sold')),
            created_at TEXT NOT NULL
        );
        INSERT INTO listings(user_id, listing_type, region, breed, age, gender, price,
            contact, photo_ids, channel_message_id, channel_message_ids, post_link,
            status, created_at)
        VALUES (100, 'Hadyaga', 'Toshkent', 'Siam', '1 yosh', 'Erkak', 'Bepul',
            '@owner', '["p1"]', 10, '[10]', 'https://t.me/c/1/10', 'active',
            '2026-01-01T00:00:00+00:00');
        """
    )
    connection.commit()
    connection.close()

    db = Database(str(path))
    try:
        old = db.get_listing(1)
        assert old["status"] == "active"
        assert old["active_since"] == "2026-01-01T00:00:00+00:00"
        assert old["description"] == ""
        new_id = db.create_listing(
            user_id=100, status="pending", **{
                k: v for k, v in listing_data().items() if k != "photo_check"
            },
        )
        assert db.get_listing(new_id)["status"] == "pending"
    finally:
        db.close()


# ---------- 6. Import of old channel posts ----------


def test_import_channel_export(database: Database, settings: Settings) -> None:
    create_listing(database, channel_message_ids=[40])  # already known
    export = {
        "id": 1234567890,
        "messages": [
            {"id": 1, "type": "service", "date_unixtime": "1700000000"},
            {
                "id": 10, "type": "message", "date_unixtime": "1700000000",
                "photo": "photos/1.jpg",
                "text": [
                    {"type": "bold", "text": "Sotiladi! "},
                    "Meyn kun mushugi, 4 oylik, o'g'il bola.\n"
                    "Samarqand shahri. Narxi 800 ming so'm\nTel: +998 91 111 22 33",
                ],
            },
            {"id": 11, "type": "message", "date_unixtime": "1700000001",
             "photo": "photos/2.jpg", "text": ""},
            {"id": 20, "type": "message", "date_unixtime": "1700001000",
             "text": "Mushukcha hadyaga beriladi, Buxoro. @kind_owner"},
            {"id": 30, "type": "message", "date_unixtime": "1700002000",
             "photo": "photos/3.jpg", "text": "✅ SOTILDI mushuk"},
            {"id": 40, "type": "message", "date_unixtime": "1700003000",
             "photo": "photos/4.jpg", "text": "Hadyaga, Toshkent"},
            {"id": 50, "type": "message", "date_unixtime": "1700004000",
             "text": "Kanalimizga xush kelibsiz!"},
        ],
    }

    report = parse_export(export, database, channel_username="mushuklar_bozori")
    assert (report.skipped_known, report.skipped_closed, report.skipped_unrecognized) == (1, 1, 1)
    sale, free = report.imported
    assert sale.message_ids == [10, 11]
    assert (sale.listing_type, sale.region, sale.gender, sale.breed) == (
        "Sotiladi", "Samarqand", "Erkak", "Meykun",
    )
    assert sale.contact == "+998 91 111 22 33"
    assert sale.post_link == "https://t.me/mushuklar_bozori/10"
    assert (free.listing_type, free.region, free.contact, free.has_media) == (
        "Hadyaga", "Buxoro", "@kind_owner", False,
    )

    save(report, database)
    found = database.search_listings(region="Samarqand", listing_type="Sotiladi")
    assert len(found) == 1 and found[0]["source"] == "import"
    assert database.channel_message_known(11) is True
    # Imported listings start their 30-day clock at import time.
    assert found[0]["active_since"] > found[0]["created_at"]

    closed = channel_caption(found[0], settings, "mushuk_bot", "sold")
    assert closed.startswith("✅ <b>SOTILDI</b>")
    assert "+998" not in closed


def test_imported_text_post_is_closed_with_edit_text(
    database: Database, settings: Settings
) -> None:
    export = {"id": 1, "messages": [
        {"id": 20, "type": "message", "date_unixtime": "1700001000",
         "text": "Mushukcha hadyaga beriladi, Buxoro. @kind_owner"},
    ]}
    save(parse_export(export, database), database)
    listing = database.search_listings(region="Buxoro")[0]
    callback = FakeCallback(user(ADMIN_ID), f"admin:sold:{listing['id']}", FakeMessage())
    bot = FakeBot()
    run(callback_handler(database, settings, "admin_listing_action")(callback, bot))
    assert bot.edited_captions == []
    assert bot.edited_texts[0]["text"].startswith("✅ <b>BERILDI</b>")
    assert "@kind_owner" not in bot.edited_texts[0]["text"]
    assert listing["post_link"] == "https://t.me/c/1/20"
