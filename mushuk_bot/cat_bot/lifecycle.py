"""30-day listing lifecycle: ask owners whether a listing is still relevant and
close listings nobody confirmed."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from .captions import escape
from .channel import close_listing
from .config import Settings
from .database import Database, days_ago, to_iso


logger = logging.getLogger(__name__)

CHECK_INTERVAL_SECONDS = 60 * 60


def renewal_keyboard(listing_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Ha, hali dolzarb", callback_data=f"renew:yes:{listing_id}")
    builder.button(text="❌ Yo‘q", callback_data=f"renew:no:{listing_id}")
    builder.adjust(1)
    return builder.as_markup()


async def run_lifecycle_check(
    bot: Bot, db: Database, settings: Settings, now: datetime | None = None
) -> dict[str, int]:
    now = now or datetime.now(timezone.utc)
    asked = closed = 0

    # Close first so a listing asked in this run is not closed immediately.
    for item in db.listings_renewal_overdue(days_ago(settings.renewal_grace_days, now)):
        await close_listing(bot, settings, db, item, "expired", announce=False)
        closed += 1
        if item["user_id"] is not None:
            try:
                await bot.send_message(
                    chat_id=item["user_id"],
                    text=(
                        f"⌛ #{item['id']} e'loningizga javob bo‘lmagani uchun u "
                        "yakunlandi va kanal postidan kontaktlar olib tashlandi."
                    ),
                )
            except TelegramAPIError:
                pass

    for item in db.listings_due_for_renewal(days_ago(settings.listing_lifetime_days, now)):
        db.mark_renewal_asked(item["id"], to_iso(now))
        asked += 1
        if item["user_id"] is None:
            continue  # Imported listing without a known owner: closes after grace.
        try:
            await bot.send_message(
                chat_id=item["user_id"],
                text=(
                    f"📅 #{item['id']} e'loningiz ({escape(item['region'])}, "
                    f"{escape(item['breed'])}) {settings.listing_lifetime_days} kundan "
                    "beri faol.\nMushuk hali ham "
                    f"{'sotuvda' if item['listing_type'] == 'Sotiladi' else 'egasini kutyapti'}"
                    f"mi?\n\n{settings.renewal_grace_days} kun ichida javob bo‘lmasa, "
                    "e'lon yakunlanadi."
                ),
                reply_markup=renewal_keyboard(item["id"]),
            )
        except TelegramAPIError:
            logger.info("Owner of listing %s is unreachable", item["id"])

    return {"asked": asked, "closed": closed}


async def lifecycle_loop(bot: Bot, db: Database, settings: Settings) -> None:
    while True:
        try:
            result = await run_lifecycle_check(bot, db, settings)
            if any(result.values()):
                logger.info("Lifecycle check: %s", result)
        except Exception:
            logger.exception("Lifecycle check failed")
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)
