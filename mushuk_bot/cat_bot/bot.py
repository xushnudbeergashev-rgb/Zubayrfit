import asyncio
import logging

from aiogram import Bot, Dispatcher, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from .config import Settings
from .database import Database
from .handlers import register_handlers
from .lifecycle import lifecycle_loop
from .moderation import Moderator


logger = logging.getLogger(__name__)


async def run_bot() -> None:
    logging.basicConfig(level=logging.INFO)
    settings = Settings.from_env()
    if not settings.admin_user_ids:
        logger.warning(
            "ADMIN_USER_IDS is empty: new listings will wait in the database "
            "without being sent to anyone for approval."
        )
    if not settings.openai_api_key:
        logger.warning(
            "OPENAI_API_KEY is not set: photo and text AI checks are skipped; "
            "only local text rules and admin review apply."
        )
    database = Database(settings.db_path)
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dispatcher = Dispatcher()
    router = Router()
    register_handlers(router, database, settings, Moderator(settings.openai_api_key))
    dispatcher.include_router(router)

    lifecycle_task = asyncio.create_task(lifecycle_loop(bot, database, settings))
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await dispatcher.start_polling(bot)
    finally:
        lifecycle_task.cancel()
        database.close()
        await bot.session.close()
