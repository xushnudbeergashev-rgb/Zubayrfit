from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from types import SimpleNamespace
from typing import Any

import pytest
from aiogram import Router
from aiogram.types import User

from cat_bot.config import Settings
from cat_bot.database import Database
from cat_bot.handlers import (
    admin_listing_caption,
    is_admin,
    register_handlers,
    send_admin_listings,
)


CHANNEL_ID = -1001234567890
ADMIN_ID = 7


@dataclass
class FakeMessage:
    answers: list[tuple[tuple[Any, ...], dict[str, Any]]] = field(default_factory=list)
    photos: list[dict[str, Any]] = field(default_factory=list)
    edited_captions: list[dict[str, Any]] = field(default_factory=list)

    async def answer(self, *args: Any, **kwargs: Any) -> None:
        self.answers.append((args, kwargs))

    async def answer_photo(self, **kwargs: Any) -> None:
        self.photos.append(kwargs)

    async def edit_caption(self, **kwargs: Any) -> None:
        self.edited_captions.append(kwargs)


@dataclass
class FakeCallback:
    from_user: User
    data: str
    message: FakeMessage
    answers: list[tuple[tuple[Any, ...], dict[str, Any]]] = field(default_factory=list)

    async def answer(self, *args: Any, **kwargs: Any) -> None:
        self.answers.append((args, kwargs))


class FakeBot:
    def __init__(self, sent_message_ids: list[int] | None = None) -> None:
        self.deleted_messages: list[tuple[int | str, int]] = []
        self.edited_captions: list[dict[str, Any]] = []
        self.edited_texts: list[dict[str, Any]] = []
        self.sent_media_groups: list[dict[str, Any]] = []
        self.sent_messages: list[dict[str, Any]] = []
        self.sent_photos: list[dict[str, Any]] = []
        self.sent_message_ids = sent_message_ids or []

    async def me(self) -> SimpleNamespace:
        return SimpleNamespace(username="mushuk_bot")

    async def send_message(self, **kwargs: Any) -> SimpleNamespace:
        self.sent_messages.append(kwargs)
        return SimpleNamespace(message_id=900 + len(self.sent_messages))

    async def send_photo(self, **kwargs: Any) -> SimpleNamespace:
        self.sent_photos.append(kwargs)
        return SimpleNamespace(message_id=800 + len(self.sent_photos))

    async def edit_message_text(self, **kwargs: Any) -> None:
        self.edited_texts.append(kwargs)

    async def delete_message(self, *, chat_id: int | str, message_id: int) -> None:
        self.deleted_messages.append((chat_id, message_id))

    async def edit_message_caption(self, **kwargs: Any) -> None:
        self.edited_captions.append(kwargs)

    async def send_media_group(self, **kwargs: Any) -> list[SimpleNamespace]:
        self.sent_media_groups.append(kwargs)
        return [
            SimpleNamespace(message_id=message_id)
            for message_id in self.sent_message_ids
        ]

    async def get_chat(self, channel_id: int | str) -> SimpleNamespace:
        assert channel_id == CHANNEL_ID
        return SimpleNamespace(username="cats_channel")


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
    db.upsert_user(100, "owner", "Cat Owner")
    yield db
    db.close()


def create_listing(
    db: Database,
    *,
    channel_message_ids: list[int] | None = None,
    breed: str = "British Shorthair",
) -> int:
    message_ids = channel_message_ids or [101, 102]
    return db.create_listing(
        user_id=100,
        listing_type="Hadyaga",
        region="Toshkent",
        breed=breed,
        age="2 yosh",
        gender="Urg‘ochi",
        price="Bepul",
        contact="@owner",
        photo_ids=["photo-1", "photo-2"],
        channel_message_id=message_ids[0],
        channel_message_ids=message_ids,
        post_link="https://t.me/cats_channel/101",
    )


def moderation_handler(database: Database, settings: Settings):
    router = Router()
    register_handlers(router, database, settings)
    return next(
        handler.callback
        for handler in router.callback_query.handlers
        if handler.callback.__name__ == "admin_listing_action"
    )


def user(user_id: int) -> User:
    return User(id=user_id, is_bot=False, first_name="Test User")


def run(coroutine) -> Any:
    return asyncio.run(coroutine)


def test_admin_authorization_accepts_configured_ids_only(settings: Settings) -> None:
    assert is_admin(user(ADMIN_ID), settings) is True
    assert is_admin(user(999), settings) is False
    assert is_admin(None, settings) is False


def test_non_admin_cannot_moderate_listing(
    database: Database, settings: Settings
) -> None:
    listing_id = create_listing(database)
    callback = FakeCallback(
        from_user=user(999),
        data=f"admin:hide:{listing_id}",
        message=FakeMessage(),
    )
    bot = FakeBot()

    run(moderation_handler(database, settings)(callback, bot))

    assert database.get_listing(listing_id)["status"] == "active"
    assert bot.deleted_messages == []
    assert callback.answers == [
        (("Bu amal faqat adminlar uchun.",), {"show_alert": True})
    ]


def test_recent_listings_are_rendered_for_admins(
    database: Database,
) -> None:
    listing_id = create_listing(database)
    message = FakeMessage()

    run(send_admin_listings(message, database))

    assert message.answers == [(("📋 So‘nggi e'lonlar (1 ta):",), {})]
    assert len(message.photos) == 1
    rendered = message.photos[0]
    assert rendered["photo"] == "photo-1"
    assert rendered["caption"] == admin_listing_caption(database.get_listing(listing_id))
    assert rendered["reply_markup"].inline_keyboard[0][0].callback_data == (
        f"admin:hide:{listing_id}"
    )


def test_hide_deletes_every_channel_message_and_persists_hidden(
    database: Database, settings: Settings
) -> None:
    listing_id = create_listing(database)
    callback = FakeCallback(
        from_user=user(ADMIN_ID),
        data=f"admin:hide:{listing_id}",
        message=FakeMessage(),
    )
    bot = FakeBot()

    run(moderation_handler(database, settings)(callback, bot))

    assert database.get_listing(listing_id)["status"] == "hidden"
    assert database.get_listing(listing_id)["channel_message_ids"] == []
    assert bot.deleted_messages == [(CHANNEL_ID, 101), (CHANNEL_ID, 102)]
    assert callback.message.edited_captions[0]["caption"].count("Yashirilgan") == 1
    assert callback.answers[-1][0] == ("E'lon yashirildi.",)


def test_restore_republishes_hidden_listing_and_persists_channel_ids(
    database: Database, settings: Settings
) -> None:
    listing_id = create_listing(database)
    database.set_listing_status(listing_id, "hidden", channel_message_ids=[])
    callback = FakeCallback(
        from_user=user(ADMIN_ID),
        data=f"admin:restore:{listing_id}",
        message=FakeMessage(),
    )
    bot = FakeBot(sent_message_ids=[201, 202])

    run(moderation_handler(database, settings)(callback, bot))

    restored = database.get_listing(listing_id)
    assert restored["status"] == "active"
    assert restored["channel_message_ids"] == [201, 202]
    assert restored["channel_message_id"] == 201
    assert restored["post_link"] == "https://t.me/cats_channel/201"
    assert len(bot.sent_media_groups) == 1
    assert bot.sent_media_groups[0]["chat_id"] == CHANNEL_ID
    assert callback.message.edited_captions[0]["caption"].count("Faol") == 1
    assert callback.answers[-1][0] == ("E'lon qayta tiklandi.",)


def test_sold_edits_channel_caption_and_persists_sold(
    database: Database, settings: Settings
) -> None:
    listing_id = create_listing(database)
    callback = FakeCallback(
        from_user=user(ADMIN_ID),
        data=f"admin:sold:{listing_id}",
        message=FakeMessage(),
    )
    bot = FakeBot()

    run(moderation_handler(database, settings)(callback, bot))

    assert database.get_listing(listing_id)["status"] == "sold"
    assert bot.deleted_messages == []
    assert len(bot.edited_captions) == 1
    assert bot.edited_captions[0]["chat_id"] == CHANNEL_ID
    assert bot.edited_captions[0]["message_id"] == 101
    caption = bot.edited_captions[0]["caption"]
    assert caption.startswith("✅ <b>BERILDI</b>")
    assert "@owner" not in caption
    assert callback.answers[-1][0] == ("E'lon sotilgan/berilgan deb belgilandi.",)


def test_search_excludes_hidden_and_sold_listings(database: Database) -> None:
    active_id = create_listing(database, breed="Active cat")
    hidden_id = create_listing(database, breed="Hidden cat")
    sold_id = create_listing(database, breed="Sold cat")
    database.set_listing_status(hidden_id, "hidden", channel_message_ids=[])
    database.set_listing_status(sold_id, "sold")

    results = database.search_listings(
        region="Toshkent",
        listing_type="Hadyaga",
    )

    assert [listing["id"] for listing in results] == [active_id]
    assert {listing["status"] for listing in results} == {"active"}