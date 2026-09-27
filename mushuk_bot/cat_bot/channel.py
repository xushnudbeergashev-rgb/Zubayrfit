"""Operations on the public channel: publishing, editing and closing posts."""

from __future__ import annotations

import logging
from typing import Any

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InputMediaPhoto, LinkPreviewOptions

from .captions import channel_caption, closed_notice
from .config import Settings
from .database import Database


logger = logging.getLogger(__name__)


async def bot_username(bot: Bot) -> str | None:
    me = await bot.me()
    return me.username


async def make_post_link(bot: Bot, channel_id: int | str, message_id: int) -> str | None:
    chat = await bot.get_chat(channel_id)
    if chat.username:
        return f"https://t.me/{chat.username}/{message_id}"
    if isinstance(channel_id, int) and str(channel_id).startswith("-100"):
        return f"https://t.me/c/{str(channel_id)[4:]}/{message_id}"
    return None


async def publish_listing_to_channel(
    bot: Bot, settings: Settings, item: dict[str, Any]
) -> tuple[list[int], str | None]:
    caption = channel_caption(item, settings, await bot_username(bot), "active")
    media = [
        InputMediaPhoto(
            media=photo_id,
            caption=caption if index == 0 else None,
            parse_mode=ParseMode.HTML,
        )
        for index, photo_id in enumerate(item["photo_ids"])
    ]
    sent_messages = await bot.send_media_group(
        chat_id=settings.channel_id,
        media=media,
    )
    message_ids = [message.message_id for message in sent_messages]
    post_link = await make_post_link(bot, settings.channel_id, message_ids[0])
    return message_ids, post_link


async def delete_listing_messages(
    bot: Bot, channel_id: int | str, message_ids: list[int]
) -> None:
    for message_id in message_ids:
        await bot.delete_message(chat_id=channel_id, message_id=message_id)


async def edit_listing_channel_caption(
    bot: Bot,
    settings: Settings,
    item: dict[str, Any],
    status: str,
) -> None:
    message_ids = item["channel_message_ids"]
    if not message_ids:
        raise RuntimeError("Listing has no channel message to edit")
    text = channel_caption(item, settings, await bot_username(bot), status)
    if item.get("post_has_media", True):
        await bot.edit_message_caption(
            chat_id=settings.channel_id,
            message_id=message_ids[0],
            caption=text,
            parse_mode=ParseMode.HTML,
        )
    else:
        await bot.edit_message_text(
            chat_id=settings.channel_id,
            message_id=message_ids[0],
            text=text,
            parse_mode=ParseMode.HTML,
        )


async def close_listing(
    bot: Bot,
    settings: Settings,
    db: Database,
    item: dict[str, Any],
    status: str,
    *,
    announce: bool,
) -> None:
    """Mark a listing sold/expired: strip contacts from the post, add the
    ✅ SOTILDI/BERILDI label, optionally announce it, and deactivate it."""
    if item["channel_message_ids"] and item["status"] != "hidden":
        try:
            await edit_listing_channel_caption(bot, settings, item, status)
        except TelegramAPIError:
            # The post may have been deleted by hand; the listing still closes.
            logger.warning("Could not edit channel post for listing %s", item["id"])
    db.set_listing_status(item["id"], status)
    if announce:
        try:
            await bot.send_message(
                chat_id=settings.channel_id,
                text=closed_notice(item),
                parse_mode=ParseMode.HTML,
                link_preview_options=LinkPreviewOptions(is_disabled=True),
            )
        except TelegramAPIError:
            logger.warning("Could not announce closed listing %s", item["id"])
