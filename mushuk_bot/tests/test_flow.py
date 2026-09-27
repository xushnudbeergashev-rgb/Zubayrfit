"""End-to-end announcement flow through a real aiogram Dispatcher with a fake
Telegram session, so handler order and FSM transitions are exercised."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from aiogram import Bot, Dispatcher, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.base import BaseSession
from aiogram.enums import ParseMode
from aiogram.methods import TelegramMethod
from aiogram.types import Chat, Message, Update, User

from cat_bot.config import Settings
from cat_bot.database import Database
from cat_bot.handlers import register_handlers

ADMIN_ID = 7
OWNER_ID = 100
CHANNEL_ID = -1001234567890


class RecordingSession(BaseSession):
    def __init__(self) -> None:
        super().__init__()
        self.calls: list[TelegramMethod] = []
        self.next_message_id = 1000

    async def make_request(self, bot, method, timeout=None):  # type: ignore[override]
        self.calls.append(method)
        name = type(method).__name__
        chat = Chat(id=getattr(method, "chat_id", OWNER_ID) if isinstance(
            getattr(method, "chat_id", None), int) else OWNER_ID, type="private")
        if name == "GetMe":
            return User(id=1, is_bot=True, first_name="Bot", username="mushuk_bot")
        if name == "GetChat":
            return Chat(id=CHANNEL_ID, type="channel", username="mushuklar_bozori")
        if name == "SendMediaGroup":
            result = []
            for _ in method.media:
                self.next_message_id += 1
                result.append(self._message(chat))
            return result
        if name in {"SendMessage", "SendPhoto"}:
            self.next_message_id += 1
            return self._message(chat)
        return True

    def _message(self, chat: Chat) -> Message:
        return Message(
            message_id=self.next_message_id, date=datetime.now(timezone.utc), chat=chat
        )

    async def close(self) -> None:
        pass

    async def stream_content(self, *args, **kwargs):  # pragma: no cover
        raise NotImplementedError

    def of(self, name: str) -> list[TelegramMethod]:
        return [call for call in self.calls if type(call).__name__ == name]


class Harness:
    def __init__(self, tmp_path) -> None:
        self.settings = Settings(
            bot_token="42:TEST",
            channel_id=CHANNEL_ID,
            db_path=str(tmp_path / "cats.db"),
            openai_api_key=None,
            admin_user_ids=frozenset({ADMIN_ID}),
        )
        self.db = Database(self.settings.db_path)
        self.session = RecordingSession()
        self.bot = Bot(
            token=self.settings.bot_token,
            session=self.session,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML),
        )
        self.dp = Dispatcher()
        router = Router()
        register_handlers(router, self.db, self.settings)
        self.dp.include_router(router)
        self.update_id = 0

    def _user(self, user_id: int) -> User:
        return User(id=user_id, is_bot=False, first_name="U", username=f"u{user_id}")

    async def send(self, user_id: int = OWNER_ID, **fields: Any) -> None:
        self.update_id += 1
        message = Message(
            message_id=self.update_id,
            date=datetime.now(timezone.utc),
            chat=Chat(id=user_id, type="private"),
            from_user=self._user(user_id),
            **fields,
        )
        await self.dp.feed_update(self.bot, Update(update_id=self.update_id, message=message))

    async def click(self, data: str, user_id: int = OWNER_ID) -> None:
        self.update_id += 1
        payload = {
            "update_id": self.update_id,
            "callback_query": {
                "id": str(self.update_id),
                "from": {"id": user_id, "is_bot": False, "first_name": "U"},
                "chat_instance": "ci",
                "data": data,
                "message": {
                    "message_id": 5, "date": 0,
                    "chat": {"id": user_id, "type": "private"}, "text": "x",
                },
            },
        }
        await self.dp.feed_update(self.bot, Update.model_validate(payload, context={"bot": self.bot}))

    def texts(self) -> list[str]:
        return [
            getattr(call, "text", None) or getattr(call, "caption", None) or ""
            for call in self.session.calls
        ]


def photo(unique: str) -> list[dict[str, Any]]:
    return [{"file_id": f"file-{unique}", "file_unique_id": unique, "width": 1, "height": 1}]


def test_paid_listing_full_flow(tmp_path) -> None:
    async def scenario() -> None:
        h = Harness(tmp_path)
        await h.send(text="/start")
        await h.send(text="📢 E'lon berish")
        await h.click("announce:Sotiladi")
        await h.click("announce_region:4")
        await h.send(text="Mening zotim")  # free text is refused at the breed step
        assert "Zotni faqat tugmalar orqali tanlang:" in h.texts()
        await h.click("breed:1")
        await h.send(text="4 oylik")
        await h.click("gender:Erkak")
        await h.send(text="arzon")  # no digits
        await h.send(text="600 000 so'm")
        await h.send(text="Obuna bo'ling t.me/spam")  # advert refused
        assert any("reklama" in text for text in h.texts())
        await h.send(text="Juda yoqimli")
        await h.send(text="+998 90 123 45 67")
        await h.send(photo=photo("cat-1"))
        await h.send(text="✅ Tayyor")
        await h.click("listing:confirm")
        assert any("9860 1606 0266 3017" in text for text in h.texts())
        await h.send(photo=photo("receipt-1"))

        listing = h.db.recent_listings()[0]
        assert listing["status"] == "pending"
        assert (listing["breed"], listing["price"], listing["description"]) == (
            "Meykun", "600 000 so'm", "Juda yoqimli",
        )
        assert listing["payment_receipt_unique_id"] == "receipt-1"
        review = h.session.of("SendPhoto")[-1]
        assert review.chat_id == ADMIN_ID

        # The same receipt can't pay for a second listing.
        await h.send(text="📢 E'lon berish")
        await h.click("announce:Sotiladi")
        await h.click("announce_region:0")
        await h.click("breed:0")
        await h.send(text="1 yosh")
        await h.click("gender:Erkak")
        await h.send(text="300 000")
        await h.send(text="-")
        await h.send(text="@good_owner")
        await h.send(photo=photo("cat-2"))
        await h.send(text="✅ Tayyor")
        await h.click("listing:confirm")
        await h.send(photo=photo("receipt-1"))
        assert any("avval ishlatilgan" in text for text in h.texts())
        assert len(h.db.recent_listings()) == 1

        await h.click(f"review:approve:{listing['id']}", user_id=ADMIN_ID)
        assert h.db.get_listing(listing["id"])["status"] == "active"
        channel_post = h.session.of("SendMediaGroup")[-1]
        assert channel_post.chat_id == CHANNEL_ID
        assert "@mushuk_bot" in channel_post.media[0].caption

        await h.send(text="/cancel")  # leave the payment step of the refused listing
        await h.send(text="Admin bilan qanday bog'lanaman?")
        assert "@zby_r" in h.texts()[-1]
        await h.send(text="/elonlarim")
        await h.click(f"owner:done:{listing['id']}")
        assert h.db.get_listing(listing["id"])["status"] == "sold"
        edit = h.session.of("EditMessageCaption")[-1]
        assert edit.caption.startswith("✅ <b>SOTILDI</b>") and "+998" not in edit.caption
        h.db.close()

    asyncio.run(scenario())
