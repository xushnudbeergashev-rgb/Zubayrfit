from __future__ import annotations

import asyncio
from collections import defaultdict
import json
import logging
import re
from typing import Any
from urllib import request

from aiogram import Bot, F, Router
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError
from aiogram.filters import Command, CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputMediaPhoto,
    Message,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

from .captions import (
    PHONE_RE,
    TYPE_FREE,
    TYPE_SALE,
    admin_listing_caption,
    admin_review_caption,
    closed_label,
    escape,
    format_card,
    format_sum,
    preview_caption,
)
from .channel import (
    close_listing,
    delete_listing_messages,
    edit_listing_channel_caption,
    publish_listing_to_channel,
)
from .config import Settings
from .database import Database, ReceiptAlreadyUsed, REGIONS, days_ago
from .moderation import Moderator


logger = logging.getLogger(__name__)

BTN_POST = "📢 E'lon berish"
BTN_SEARCH = "🔍 Mushuk qidirish"
BTN_FAQ = "❓ Savol-Javob (AI)"
# Labels from the previous menu, still on some users' keyboards.
LEGACY_SEARCH = "🐱 Mushuk qidirish"
LEGACY_FAQ = "❓ Savol berish / Yordam"
BTN_CANCEL = "❌ Bekor qilish"
BTN_PHOTOS_DONE = "✅ Tayyor"

BREEDS = ("Siam", "Meykun", "Boshqa/Oddiy", "Zotdor emas")

MAX_PHOTOS = 10  # Telegram media group limit.
MAX_PENDING_PER_USER = 2
MAX_LISTINGS_PER_DAY = 3
MAX_DESCRIPTION_LENGTH = 300
USERNAME_CONTACT_RE = re.compile(r"^@[A-Za-z0-9_]{5,32}$")
ADMIN_QUESTION_RE = re.compile(r"(admin|админ|moderator|модератор)", re.IGNORECASE)

TEXT_REJECTIONS = {
    "profanity": "❌ Matnda so‘kinish yoki haqoratli so‘zlar bor. Iltimos, odobli yozing.",
    "advertising": "❌ Matnda havola yoki reklama bor. Izoh va narxda reklama taqiqlangan.",
    "openai_moderation": "❌ Matn moderatsiyadan o‘tmadi: nojo‘ya mazmun aniqlandi.",
}


class AnnouncementForm(StatesGroup):
    type = State()
    region = State()
    breed = State()
    age = State()
    gender = State()
    price = State()
    description = State()
    contact = State()
    photos = State()
    confirm = State()
    payment = State()


class SearchForm(StatesGroup):
    region = State()
    type = State()


class FAQForm(StatesGroup):
    question = State()


def main_menu() -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=BTN_POST)
    builder.button(text=BTN_SEARCH)
    builder.button(text=BTN_FAQ)
    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True, input_field_placeholder="Bo‘limni tanlang")


def cancel_keyboard() -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=BTN_CANCEL)
    return builder.as_markup(resize_keyboard=True)


def type_keyboard(prefix: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="🎁 Hadyaga", callback_data=f"{prefix}:Hadyaga")
    builder.button(text="💰 Sotiladi", callback_data=f"{prefix}:Sotiladi")
    builder.adjust(1)
    return builder.as_markup()


def region_keyboard(prefix: str, include_all: bool = False) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    if include_all:
        builder.button(text="🌐 Barcha hududlar", callback_data=f"{prefix}:all")
    for index, region in enumerate(REGIONS):
        builder.button(text=region, callback_data=f"{prefix}:{index}")
    builder.adjust(2)
    return builder.as_markup()


def breed_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for index, breed in enumerate(BREEDS):
        builder.button(text=breed, callback_data=f"breed:{index}")
    builder.adjust(2)
    return builder.as_markup()


def gender_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="♂️ Erkak", callback_data="gender:Erkak")
    builder.button(text="♀️ Urg‘ochi", callback_data="gender:Urg‘ochi")
    builder.button(text="❔ Noma'lum", callback_data="gender:Noma'lum")
    builder.adjust(1)
    return builder.as_markup()


def confirmation_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Tasdiqlash", callback_data="listing:confirm")
    builder.button(text="✏️ O‘zgartirish", callback_data="listing:edit")
    builder.adjust(1)
    return builder.as_markup()


def review_keyboard(listing_id: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="🟢 Tasdiqlash", callback_data=f"review:approve:{listing_id}")
    builder.button(text="🔴 Rad etish", callback_data=f"review:reject:{listing_id}")
    builder.adjust(2)
    return builder.as_markup()


def owner_keyboard(item: dict[str, Any]) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text=f"✅ {closed_label(item['listing_type']).capitalize()}",
        callback_data=f"owner:done:{item['id']}",
    )
    return builder.as_markup()


def admin_panel_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="📋 So‘nggi e'lonlar", callback_data="admin:listings")
    builder.adjust(1)
    return builder.as_markup()


def admin_listing_keyboard(status: str, listing_id: int) -> InlineKeyboardMarkup:
    if status == "pending":
        return review_keyboard(listing_id)
    builder = InlineKeyboardBuilder()
    hide = ("🙈 Yashirish", f"admin:hide:{listing_id}")
    sold = ("✅ Sotildi / Berildi", f"admin:sold:{listing_id}")
    restore = ("👁️ Qayta tiklash", f"admin:restore:{listing_id}")
    buttons = {
        "active": [hide, sold],
        "hidden": [restore, sold],
        "sold": [restore, hide],
        "expired": [restore, hide],
    }.get(status, [])
    for text, data in buttons:
        builder.button(text=text, callback_data=data)
    builder.adjust(1)
    return builder.as_markup()


def photos_done_keyboard() -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=BTN_PHOTOS_DONE)
    builder.button(text=BTN_CANCEL)
    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True)


def payment_instructions(settings: Settings) -> str:
    return (
        "💳 <b>Pullik e'lon — "
        f"{format_sum(settings.listing_fee)} so‘m</b>\n\n"
        f"Karta: <code>{escape(format_card(settings.payment_card))}</code>\n"
        f"Ega: {escape(settings.payment_card_owner)}\n\n"
        "To‘lovni amalga oshirib, <b>chek rasmini (skrinshot)</b> shu yerga yuboring. "
        "Chek admin tomonidan tekshiriladi."
    )


def spam_limit_message(db: Database, user_id: int) -> str | None:
    """Return a refusal text when the user hit an anti-spam limit."""
    if db.count_user_listings(user_id, status="pending") >= MAX_PENDING_PER_USER:
        return (
            "⏳ Sizda tasdiqlanishi kutilayotgan e'lonlar yetarli. "
            "Admin ularni ko‘rib chiqqanidan keyin yangisini yuboring."
        )
    if db.count_user_listings(user_id, since=days_ago(1)) >= MAX_LISTINGS_PER_DAY:
        return (
            f"🚫 Bir kunda {MAX_LISTINGS_PER_DAY} tadan ortiq e'lon berib bo‘lmaydi. "
            "Ertaga qayta urinib ko‘ring."
        )
    return None


async def submit_for_review(
    bot: Bot,
    db: Database,
    settings: Settings,
    user_id: int,
    data: dict[str, Any],
    *,
    receipt_file_id: str | None = None,
    receipt_unique_id: str | None = None,
) -> int:
    """Store a pending listing and send it to every admin for approval.
    Raises ReceiptAlreadyUsed if the receipt was attached before."""
    listing_id = db.create_listing(
        user_id=user_id,
        listing_type=data["listing_type"],
        region=data["region"],
        breed=data["breed"],
        age=data["age"],
        gender=data["gender"],
        price=data["price"],
        contact=data["contact"],
        description=data.get("description", ""),
        photo_ids=data["photo_ids"],
        status="pending",
        payment_receipt_file_id=receipt_file_id,
        payment_receipt_unique_id=receipt_unique_id,
        photo_check=data.get("photo_check", "skipped"),
    )
    listing = db.get_listing(listing_id)
    assert listing is not None
    await notify_admins(bot, settings, listing)
    return listing_id


async def notify_admins(bot: Bot, settings: Settings, listing: dict[str, Any]) -> int:
    if not settings.admin_user_ids:
        logger.warning("ADMIN_USER_IDS is empty: listing %s awaits review", listing["id"])
    delivered = 0
    caption = admin_review_caption(listing, settings)
    for admin_id in settings.admin_user_ids:
        try:
            await bot.send_media_group(
                chat_id=admin_id,
                media=[InputMediaPhoto(media=photo_id) for photo_id in listing["photo_ids"]],
            )
            if listing["payment_receipt_file_id"]:
                await bot.send_photo(
                    chat_id=admin_id,
                    photo=listing["payment_receipt_file_id"],
                    caption=caption,
                    reply_markup=review_keyboard(listing["id"]),
                )
            else:
                await bot.send_message(
                    chat_id=admin_id,
                    text=caption,
                    reply_markup=review_keyboard(listing["id"]),
                )
            delivered += 1
        except TelegramAPIError:
            logger.exception("Could not send listing %s to admin %s", listing["id"], admin_id)
    return delivered


def register_handlers(
    router: Router,
    db: Database,
    settings: Settings,
    moderator: Moderator | None = None,
) -> None:
    moderator = moderator or Moderator(settings.openai_api_key)
    photo_locks: defaultdict[int, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def reject_text(message: Message, text: str) -> bool:
        verdict = await moderator.check_text(text)
        if verdict.allowed:
            return False
        await message.answer(TEXT_REJECTIONS.get(verdict.reason, TEXT_REJECTIONS["profanity"]))
        return True

    @router.message(CommandStart())
    async def start(message: Message, state: FSMContext) -> None:
        if message.from_user is not None:
            db.upsert_user(
                message.from_user.id,
                message.from_user.username,
                message.from_user.full_name,
            )
        await state.clear()
        await message.answer(
            "Assalomu alaykum! 🐱\n\n"
            "Mushuklar bozoriga xush kelibsiz. "
            "Bu yerda mushukni hadyaga berish, sotish yoki topish mumkin.\n\n"
            "Faol e'lonlaringiz: /elonlarim",
            reply_markup=main_menu(),
        )

    @router.message(F.text == BTN_CANCEL)
    @router.message(Command("cancel"))
    async def cancel(message: Message, state: FSMContext) -> None:
        await state.clear()
        await message.answer("Amal bekor qilindi. Asosiy menyu:", reply_markup=main_menu())

    # ---------- Announcement flow ----------

    @router.message(F.text == BTN_POST)
    async def start_announcement(message: Message, state: FSMContext) -> None:
        await state.clear()
        if message.from_user is not None:
            db.upsert_user(
                message.from_user.id,
                message.from_user.username,
                message.from_user.full_name,
            )
            refusal = spam_limit_message(db, message.from_user.id)
            if refusal:
                await message.answer(refusal, reply_markup=main_menu())
                return
        await state.set_state(AnnouncementForm.type)
        await message.answer(
            f"E'lon berish boshlandi.\n🎁 Hadyaga — bepul\n"
            f"💰 Sotiladi — {format_sum(settings.listing_fee)} so‘m",
            reply_markup=cancel_keyboard(),
        )
        await message.answer("E'lon turini tanlang:", reply_markup=type_keyboard("announce"))

    @router.callback_query(AnnouncementForm.type, F.data.startswith("announce:"))
    async def choose_announcement_type(
        callback: CallbackQuery, state: FSMContext
    ) -> None:
        listing_type = callback.data.split(":", 1)[1]
        if listing_type not in {TYPE_FREE, TYPE_SALE}:
            await callback.answer()
            return
        await state.update_data(
            listing_type=listing_type,
            price="Hadyaga / Bepul" if listing_type == TYPE_FREE else None,
        )
        await state.set_state(AnnouncementForm.region)
        await callback.answer()
        await callback.message.edit_text(
            "Viloyat yoki shaharni tanlang:",
            reply_markup=region_keyboard("announce_region"),
        )

    @router.callback_query(AnnouncementForm.region, F.data.startswith("announce_region:"))
    async def choose_announcement_region(
        callback: CallbackQuery, state: FSMContext
    ) -> None:
        index = int(callback.data.rsplit(":", 1)[1])
        await state.update_data(region=REGIONS[index])
        await state.set_state(AnnouncementForm.breed)
        await callback.answer()
        await callback.message.edit_text(
            "Mushuk zotini tanlang:", reply_markup=breed_keyboard()
        )

    @router.callback_query(AnnouncementForm.breed, F.data.startswith("breed:"))
    async def choose_breed(callback: CallbackQuery, state: FSMContext) -> None:
        index = int(callback.data.split(":", 1)[1])
        await state.update_data(breed=BREEDS[index])
        await state.set_state(AnnouncementForm.age)
        await callback.answer()
        await callback.message.edit_text(f"Zoti: {BREEDS[index]}")
        await callback.message.answer(
            "Mushuk yoshini yozing (masalan: 4 oylik yoki 2 yosh):"
        )

    @router.message(AnnouncementForm.breed)
    async def breed_must_be_button(message: Message) -> None:
        await message.answer(
            "Zotni faqat tugmalar orqali tanlang:", reply_markup=breed_keyboard()
        )

    @router.message(AnnouncementForm.age, F.text)
    async def receive_age(message: Message, state: FSMContext) -> None:
        age = message.text.strip()
        if len(age) > 30:
            await message.answer("Yoshni qisqa yozing (masalan: 4 oylik).")
            return
        if await reject_text(message, age):
            return
        await state.update_data(age=age)
        await state.set_state(AnnouncementForm.gender)
        await message.answer("Mushuk jinsini tanlang:", reply_markup=gender_keyboard())

    @router.callback_query(AnnouncementForm.gender, F.data.startswith("gender:"))
    async def receive_gender(callback: CallbackQuery, state: FSMContext) -> None:
        gender = callback.data.split(":", 1)[1]
        data = await state.get_data()
        await state.update_data(gender=gender)
        await callback.answer()
        if data.get("listing_type") == TYPE_SALE:
            await state.set_state(AnnouncementForm.price)
            await callback.message.edit_text("Narxini yozing (so‘mda, masalan: 500 000):")
        else:
            await state.set_state(AnnouncementForm.description)
            await callback.message.edit_text(DESCRIPTION_PROMPT)

    @router.message(AnnouncementForm.price, F.text)
    async def receive_price(message: Message, state: FSMContext) -> None:
        price = message.text.strip()
        if not re.search(r"\d", price) or len(price) > 40:
            await message.answer("Narxni raqamlar bilan yozing (masalan: 500 000 so‘m).")
            return
        if await reject_text(message, price):
            return
        await state.update_data(price=price)
        await state.set_state(AnnouncementForm.description)
        await message.answer(DESCRIPTION_PROMPT)

    @router.message(AnnouncementForm.description, F.text)
    async def receive_description(message: Message, state: FSMContext) -> None:
        description = message.text.strip()
        if description == "-":
            description = ""
        if len(description) > MAX_DESCRIPTION_LENGTH:
            await message.answer(
                f"Izoh {MAX_DESCRIPTION_LENGTH} belgidan oshmasin. Qisqartirib yuboring."
            )
            return
        if description and await reject_text(message, description):
            return
        await state.update_data(description=description)
        await state.set_state(AnnouncementForm.contact)
        await message.answer("Aloqa uchun telefon raqam yoki @username yuboring:")

    @router.message(AnnouncementForm.contact, F.text)
    async def receive_contact(message: Message, state: FSMContext) -> None:
        contact = message.text.strip()
        if not (PHONE_RE.fullmatch(contact) or USERNAME_CONTACT_RE.fullmatch(contact)):
            await message.answer(
                "Faqat telefon raqam (masalan: +998 90 123 45 67) yoki @username yuboring."
            )
            return
        await state.update_data(contact=contact, photo_ids=[], photo_check="passed")
        await state.set_state(AnnouncementForm.photos)
        await message.answer(
            "Mushukning rasmini yuboring. Kamida 1 ta, ko‘pi bilan "
            f"{MAX_PHOTOS} ta rasm.\n"
            "Rasmlar AI orqali tekshiriladi: faqat mushuk rasmlari qabul qilinadi.\n"
            "Tugatgach «✅ Tayyor»ni bosing.",
            reply_markup=photos_done_keyboard(),
        )

    @router.message(AnnouncementForm.photos, F.photo)
    async def receive_photo(message: Message, state: FSMContext, bot: Bot) -> None:
        photo = message.photo[-1]
        is_cat = await check_cat_photo(bot, moderator, photo.file_id)
        if is_cat is False:
            await message.answer(
                "🚫 Bu rasmda mushuk aniqlanmadi. Iltimos, faqat mushuk rasmini yuboring."
            )
            return
        # Albums arrive as parallel updates; serialise the read-modify-write.
        async with photo_locks[message.chat.id]:
            data = await state.get_data()
            photo_ids = list(data.get("photo_ids", []))
            if len(photo_ids) >= MAX_PHOTOS:
                await message.answer(f"Ko‘pi bilan {MAX_PHOTOS} ta rasm yuborish mumkin.")
                return
            photo_ids.append(photo.file_id)
            update: dict[str, Any] = {"photo_ids": photo_ids}
            if is_cat is None:
                update["photo_check"] = "skipped"
            await state.update_data(**update)
        await message.answer(
            f"✅ Rasm qabul qilindi ({len(photo_ids)} ta). "
            "Yana rasm yuboring yoki «✅ Tayyor»ni bosing."
        )

    @router.message(AnnouncementForm.photos, F.text == BTN_PHOTOS_DONE)
    async def finish_photos(message: Message, state: FSMContext) -> None:
        data = await state.get_data()
        if not data.get("photo_ids"):
            await message.answer("Kamida 1 ta mushuk rasmini yuborish kerak.")
            return
        await state.set_state(AnnouncementForm.confirm)
        media = [
            InputMediaPhoto(
                media=photo_id,
                caption=preview_caption(data) if index == 0 else None,
                parse_mode=ParseMode.HTML,
            )
            for index, photo_id in enumerate(data["photo_ids"])
        ]
        await message.bot.send_media_group(chat_id=message.chat.id, media=media)
        await message.answer(
            "E'lonni tekshiring. Tasdiqlagach, u admin ko‘rigiga yuboriladi:",
            reply_markup=confirmation_keyboard(),
        )

    @router.message(AnnouncementForm.photos)
    async def photos_expected(message: Message) -> None:
        await message.answer("Mushuk rasmini yuboring yoki «✅ Tayyor»ni bosing.")

    @router.callback_query(AnnouncementForm.confirm, F.data == "listing:edit")
    async def edit_announcement(callback: CallbackQuery, state: FSMContext) -> None:
        await state.clear()
        await state.set_state(AnnouncementForm.type)
        await callback.answer()
        await callback.message.answer(
            "E'lonni qaytadan to‘ldiramiz. E'lon turini tanlang:",
            reply_markup=type_keyboard("announce"),
        )

    @router.callback_query(AnnouncementForm.confirm, F.data == "listing:confirm")
    async def confirm_announcement(
        callback: CallbackQuery, state: FSMContext, bot: Bot
    ) -> None:
        data = await state.get_data()
        if not data.get("photo_ids"):
            await callback.answer("Rasm topilmadi. Qaytadan boshlang.", show_alert=True)
            return
        refusal = spam_limit_message(db, callback.from_user.id)
        if refusal:
            await state.clear()
            await callback.answer()
            await callback.message.answer(refusal, reply_markup=main_menu())
            return
        await callback.answer()
        await callback.message.edit_reply_markup(reply_markup=None)
        if data["listing_type"] == TYPE_SALE:
            await state.set_state(AnnouncementForm.payment)
            await callback.message.answer(
                payment_instructions(settings), reply_markup=cancel_keyboard()
            )
            return
        listing_id = await submit_for_review(
            bot, db, settings, callback.from_user.id, data
        )
        await state.clear()
        await callback.message.answer(submitted_text(listing_id), reply_markup=main_menu())

    @router.message(AnnouncementForm.payment, F.photo)
    async def receive_receipt(message: Message, state: FSMContext, bot: Bot) -> None:
        receipt = message.photo[-1]
        if db.receipt_used(receipt.file_unique_id):
            await message.answer(
                "🚫 Bu chek avval ishlatilgan. Iltimos, yangi to‘lov chekini yuboring."
            )
            return
        data = await state.get_data()
        try:
            listing_id = await submit_for_review(
                bot,
                db,
                settings,
                message.from_user.id,
                data,
                receipt_file_id=receipt.file_id,
                receipt_unique_id=receipt.file_unique_id,
            )
        except ReceiptAlreadyUsed:
            await message.answer(
                "🚫 Bu chek avval ishlatilgan. Iltimos, yangi to‘lov chekini yuboring."
            )
            return
        await state.clear()
        await message.answer(submitted_text(listing_id), reply_markup=main_menu())

    @router.message(AnnouncementForm.payment)
    async def receipt_expected(message: Message) -> None:
        await message.answer("To‘lov chekini rasm (skrinshot) ko‘rinishida yuboring.")

    # ---------- Admin review ----------

    @router.callback_query(F.data.startswith("review:"))
    async def review_listing(callback: CallbackQuery, bot: Bot) -> None:
        if not is_admin(callback.from_user, settings):
            await callback.answer("Bu amal faqat adminlar uchun.", show_alert=True)
            return
        parts = (callback.data or "").split(":")
        if len(parts) != 3 or parts[1] not in {"approve", "reject"} or not parts[2].isdigit():
            await callback.answer("Noma'lum amal.", show_alert=True)
            return
        listing = db.get_listing(int(parts[2]))
        if listing is None:
            await callback.answer("E'lon topilmadi.", show_alert=True)
            return
        if listing["status"] != "pending":
            await callback.answer("Bu e'lon allaqachon ko‘rib chiqilgan.", show_alert=True)
            return

        if parts[1] == "approve":
            try:
                await approve_listing(bot, db, settings, listing)
            except TelegramAPIError:
                logger.exception("Publishing listing %s failed", listing["id"])
                await callback.answer(
                    "Kanalga joylab bo‘lmadi. Botning kanal huquqlarini tekshiring.",
                    show_alert=True,
                )
                return
            notice = f"🟢 #{listing['id']} tasdiqlandi va kanalga joylandi."
        else:
            await reject_listing(bot, db, listing)
            notice = f"🔴 #{listing['id']} rad etildi."

        if callback.message is not None:
            try:
                await callback.message.edit_reply_markup(reply_markup=None)
                await callback.message.answer(notice)
            except TelegramAPIError:
                pass
        await callback.answer(notice)

    # ---------- Owner actions ----------

    @router.message(Command("elonlarim"))
    async def my_listings(message: Message) -> None:
        listings = db.user_active_listings(message.from_user.id)
        if not listings:
            await message.answer("Sizda faol e'lonlar yo‘q.", reply_markup=main_menu())
            return
        for item in listings:
            link = f'\n🔗 <a href="{escape(item["post_link"])}">Kanalda</a>' if item["post_link"] else ""
            await message.answer(
                f"🆔 #{item['id']} — {escape(item['listing_type'])}, "
                f"{escape(item['region'])}, {escape(item['breed'])}{link}",
                reply_markup=owner_keyboard(item),
            )

    @router.callback_query(F.data.startswith("owner:done:"))
    async def owner_mark_done(callback: CallbackQuery, bot: Bot) -> None:
        listing = owned_listing(db, callback)
        if listing is None or listing["status"] != "active":
            await callback.answer("Bu e'lon faol emas.", show_alert=True)
            return
        await close_listing(bot, settings, db, listing, "sold", announce=True)
        label = closed_label(listing["listing_type"])
        await callback.answer(f"✅ {label}")
        await callback.message.edit_text(
            f"✅ #{listing['id']} e'lon «{label}» deb belgilandi. Rahmat!"
        )

    @router.callback_query(F.data.startswith("renew:"))
    async def owner_renewal_answer(callback: CallbackQuery, bot: Bot) -> None:
        listing = owned_listing(db, callback)
        if listing is None or listing["status"] != "active":
            await callback.answer("Bu e'lon faol emas.", show_alert=True)
            return
        if callback.data.startswith("renew:yes:"):
            db.renew_listing(listing["id"])
            text = (
                f"👍 #{listing['id']} e'lon yana {settings.listing_lifetime_days} kun "
                "faol qoladi."
            )
        else:
            await close_listing(bot, settings, db, listing, "expired", announce=False)
            text = f"✅ #{listing['id']} e'lon yakunlandi. Rahmat!"
        await callback.answer()
        await callback.message.edit_text(text)

    # ---------- Search ----------

    @router.message(F.text.in_({BTN_SEARCH, LEGACY_SEARCH}))
    async def start_search(message: Message, state: FSMContext) -> None:
        await state.clear()
        await state.set_state(SearchForm.region)
        await message.answer(
            "Qaysi hududdan mushuk qidiryapsiz?",
            reply_markup=region_keyboard("search_region", include_all=True),
        )

    @router.callback_query(SearchForm.region, F.data.startswith("search_region:"))
    async def choose_search_region(callback: CallbackQuery, state: FSMContext) -> None:
        raw_region = callback.data.rsplit(":", 1)[1]
        region = None if raw_region == "all" else REGIONS[int(raw_region)]
        await state.update_data(region=region)
        await state.set_state(SearchForm.type)
        await callback.answer()
        await callback.message.edit_text(
            "E'lon turini tanlang:",
            reply_markup=type_keyboard("search_type"),
        )

    @router.callback_query(SearchForm.type, F.data.startswith("search_type:"))
    async def choose_search_type(callback: CallbackQuery, state: FSMContext) -> None:
        listing_type = callback.data.split(":", 1)[1]
        data = await state.get_data()
        results = db.search_listings(
            region=data.get("region"),
            listing_type=listing_type,
        )
        await state.clear()
        await callback.answer()
        await callback.message.edit_text(
            f"🔎 Natijalar: {len(results)} ta e'lon topildi."
        )
        await send_listing_results(callback.message, results)

    # ---------- Admin tools ----------

    @router.message(Command("admin_listings"))
    async def admin_listings_command(message: Message) -> None:
        if not is_admin(message.from_user, settings):
            await message.answer("Bu buyruq faqat adminlar uchun.")
            return
        await send_admin_listings(message, db)

    @router.callback_query(F.data == "admin:listings")
    async def admin_listings_callback(callback: CallbackQuery) -> None:
        if not is_admin(callback.from_user, settings):
            await callback.answer("Bu bo‘lim faqat adminlar uchun.", show_alert=True)
            return
        await callback.answer()
        if callback.message is not None:
            await send_admin_listings(callback.message, db)

    @router.callback_query(F.data.startswith("admin:"))
    async def admin_listing_action(callback: CallbackQuery, bot: Bot) -> None:
        if not is_admin(callback.from_user, settings):
            await callback.answer("Bu amal faqat adminlar uchun.", show_alert=True)
            return
        if callback.data is None or callback.message is None:
            await callback.answer("So‘rovni qayta yuboring.", show_alert=True)
            return
        parts = callback.data.split(":")
        if len(parts) != 3 or parts[1] not in {"hide", "restore", "sold"}:
            await callback.answer("Noma'lum admin amali.", show_alert=True)
            return
        try:
            listing_id = int(parts[2])
        except ValueError:
            await callback.answer("E'lon raqami noto‘g‘ri.", show_alert=True)
            return

        listing = db.get_listing(listing_id)
        if listing is None:
            await callback.answer("E'lon topilmadi.", show_alert=True)
            return
        if listing["status"] in {"pending", "rejected"}:
            await callback.answer(
                "Bu e'lon kanalda chop etilmagan.", show_alert=True
            )
            return

        action = parts[1]
        try:
            if action == "hide":
                if listing["status"] != "hidden":
                    await delete_listing_messages(
                        bot, settings.channel_id, listing["channel_message_ids"]
                    )
                    db.set_listing_status(
                        listing_id,
                        "hidden",
                        channel_message_ids=[],
                    )
                notice = "E'lon yashirildi."
            elif action == "sold":
                if listing["status"] != "sold":
                    await close_listing(bot, settings, db, listing, "sold", announce=False)
                notice = "E'lon sotilgan/berilgan deb belgilandi."
            else:
                if listing["status"] == "hidden" or not listing["channel_message_ids"]:
                    if not listing["photo_ids"]:
                        await callback.answer(
                            "Rasmsiz (import qilingan) e'lonni qayta chop etib bo‘lmaydi.",
                            show_alert=True,
                        )
                        return
                    message_ids, post_link = await publish_listing_to_channel(
                        bot, settings, listing
                    )
                    db.set_listing_status(
                        listing_id,
                        "active",
                        channel_message_id=message_ids[0],
                        channel_message_ids=message_ids,
                        post_link=post_link,
                    )
                else:
                    if listing["status"] in {"sold", "expired"}:
                        await edit_listing_channel_caption(
                            bot, settings, listing, "active"
                        )
                    db.set_listing_status(listing_id, "active")
                notice = "E'lon qayta tiklandi."
        except Exception:
            logger.exception("Admin action %s failed for listing %s", action, listing_id)
            await callback.answer(
                "Telegram kanalidagi postni yangilab bo‘lmadi. "
                "Botning kanal administrator huquqlarini tekshiring.",
                show_alert=True,
            )
            return

        updated_listing = db.get_listing(listing_id)
        if updated_listing is not None:
            await callback.message.edit_caption(
                caption=admin_listing_caption(updated_listing),
                reply_markup=admin_listing_keyboard(
                    updated_listing["status"], listing_id
                ),
            )
        await callback.answer(notice)

    @router.message(Command("admin"))
    async def admin_stats(message: Message) -> None:
        if not is_admin(message.from_user, settings):
            await message.answer("Bu buyruq faqat adminlar uchun.")
            return
        stats = db.stats()
        await message.answer(
            "📊 <b>Bot statistikasi</b>\n\n"
            f"Foydalanuvchilar: {stats['users']}\n"
            f"Faol e'lonlar: {stats['active_listings']}\n"
            f"Tasdiq kutayotgan: {stats['pending_listings']}\n"
            f"Hadyaga: {stats['hadyaga']}\n"
            f"Sotiladi: {stats['sotiladi']}",
            reply_markup=admin_panel_keyboard(),
        )

    # ---------- Q&A (AI) and free chat ----------

    @router.message(F.text.in_({BTN_FAQ, LEGACY_FAQ}))
    async def start_faq(message: Message, state: FSMContext) -> None:
        await state.clear()
        await state.set_state(FAQForm.question)
        await message.answer(
            "🤖 Savolingizni yozing. Masalan: «E'lon berish uchun nima kerak?» "
            "yoki «Mushukni qanday xavfsiz asrab olish mumkin?»",
            reply_markup=main_menu(),
        )

    @router.message(FAQForm.question, F.text)
    async def answer_faq(message: Message, state: FSMContext) -> None:
        await state.clear()
        await message.answer(
            await answer_question(message.text, settings), reply_markup=main_menu()
        )

    # Registered last so it only sees text no other handler claimed.
    @router.message(StateFilter(None), F.text, ~F.text.startswith("/"))
    async def free_chat(message: Message) -> None:
        await message.answer(
            await answer_question(message.text, settings), reply_markup=main_menu()
        )


DESCRIPTION_PROMPT = (
    "Mushuk haqida qisqa izoh yozing (xarakteri, emlanganmi, va h.k.).\n"
    "Izoh kerak bo‘lmasa «-» yuboring. Havola va reklama taqiqlangan."
)


def submitted_text(listing_id: int) -> str:
    return (
        f"✅ E'loningiz (#{listing_id}) qabul qilindi va admin tasdig‘iga yuborildi.\n"
        "Tasdiqlangach, kanalga joylanadi va sizga xabar beramiz."
    )


async def check_cat_photo(bot: Bot, moderator: Moderator, file_id: str) -> bool | None:
    if not moderator.api_key:
        return None
    try:
        buffer = await bot.download(file_id)
    except TelegramAPIError:
        logger.exception("Could not download photo for vision check")
        return None
    if buffer is None:
        return None
    return await moderator.is_cat_photo(buffer.getvalue())


async def approve_listing(
    bot: Bot, db: Database, settings: Settings, listing: dict[str, Any]
) -> None:
    message_ids, post_link = await publish_listing_to_channel(bot, settings, listing)
    db.set_listing_status(
        listing["id"],
        "active",
        channel_message_id=message_ids[0],
        channel_message_ids=message_ids,
        post_link=post_link,
    )
    if listing["user_id"] is None:
        return
    link_text = f'\n🔗 <a href="{escape(post_link)}">Kanalda ko‘rish</a>' if post_link else ""
    try:
        await bot.send_message(
            chat_id=listing["user_id"],
            text=(
                f"🎉 #{listing['id']} e'loningiz tasdiqlandi va kanalga joylandi!"
                f"{link_text}\n\nMushuk "
                f"{'sotilgach' if listing['listing_type'] == TYPE_SALE else 'berilgach'}"
                " quyidagi tugmani bosing:"
            ),
            reply_markup=owner_keyboard(listing),
        )
    except TelegramAPIError:
        logger.info("Owner of listing %s is unreachable", listing["id"])


async def reject_listing(bot: Bot, db: Database, listing: dict[str, Any]) -> None:
    db.set_listing_status(listing["id"], "rejected")
    if listing["user_id"] is None:
        return
    try:
        await bot.send_message(
            chat_id=listing["user_id"],
            text=(
                f"🔴 #{listing['id']} e'loningiz admin tomonidan rad etildi.\n"
                "Savollaringiz bo‘lsa, «❓ Savol-Javob (AI)» bo‘limiga yozing."
            ),
        )
    except TelegramAPIError:
        logger.info("Owner of listing %s is unreachable", listing["id"])


def owned_listing(db: Database, callback: CallbackQuery) -> dict[str, Any] | None:
    raw_id = (callback.data or "").rsplit(":", 1)[-1]
    if not raw_id.isdigit():
        return None
    listing = db.get_listing(int(raw_id))
    if listing is None or listing["user_id"] != callback.from_user.id:
        return None
    return listing


def is_admin(user: Any, settings: Settings) -> bool:
    return user is not None and user.id in settings.admin_user_ids


async def send_admin_listings(message: Message, db: Database) -> None:
    listings = db.recent_listings()
    if not listings:
        await message.answer("Hozircha e'lonlar yo‘q.")
        return
    await message.answer(f"📋 So‘nggi e'lonlar ({len(listings)} ta):")
    for item in listings:
        if item["photo_ids"]:
            await message.answer_photo(
                photo=item["photo_ids"][0],
                caption=admin_listing_caption(item),
                reply_markup=admin_listing_keyboard(item["status"], item["id"]),
            )
        else:
            await message.answer(
                admin_listing_caption(item),
                reply_markup=admin_listing_keyboard(item["status"], item["id"]),
            )


async def send_listing_results(message: Message, results: list[dict[str, Any]]) -> None:
    if not results:
        await message.answer(
            "Bu filter bo‘yicha faol e'lonlar topilmadi. Boshqa hudud yoki tur bilan urinib ko‘ring."
        )
        return
    for item in results:
        caption = (
            f"🐱 <b>{escape(item['listing_type'])}</b>\n"
            f"📍 {escape(item['region'])}\n"
            f"🧬 {escape(item['breed'])}\n"
            f"🎂 {escape(item['age'])} | ⚧ {escape(item['gender'])}\n"
            f"💰 {escape(item['price'])}\n"
            f"☎️ {escape(item['contact'])}"
        )
        markup = None
        if item.get("post_link"):
            markup = InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="📌 Kanal postini ochish",
                            url=item["post_link"],
                        )
                    ]
                ]
            )
        if item["photo_ids"]:
            await message.answer_photo(
                photo=item["photo_ids"][0],
                caption=caption,
                reply_markup=markup,
            )
        else:
            await message.answer(caption, reply_markup=markup)


def asks_for_admin(question: str) -> bool:
    return bool(ADMIN_QUESTION_RE.search(question))


async def answer_question(question: str, settings: Settings) -> str:
    if asks_for_admin(question):
        return f"👤 Administrator bilan bog‘lanish: {escape(settings.admin_contact)}"
    answer = faq_answer(question, settings)
    if answer is None and settings.openai_api_key:
        ai_answer = await ask_openai(settings.openai_api_key, question)
        if ai_answer:
            answer = escape(ai_answer)
    if answer is None:
        answer = (
            "Bu savol bo‘yicha tayyor javob topilmadi. "
            "E'lon berish uchun «📢 E'lon berish» bo‘limidan foydalaning yoki "
            "savolni aniqroq yozing."
        )
    return answer


def faq_answer(question: str, settings: Settings | None = None) -> str | None:
    normalized = question.lower().replace("’", "'").replace("‘", "'")
    fee = format_sum(settings.listing_fee if settings else 7000)
    if any(word in normalized for word in ("narx", "to'lov", "tolov", "pullik")):
        return (
            f"«Hadyaga» e'lonlari bepul. «Sotiladi» e'loni — {fee} so‘m; "
            "to‘lov chekini botga yuborasiz, admin tekshirib tasdiqlaydi."
        )
    if any(word in normalized for word in ("e'lon", "elon", "post", "joylash")):
        return (
            "E'lon berish uchun «📢 E'lon berish»ni bosing. Turi, hududi, zoti, "
            "yoshi, jinsi, narxi, izoh, aloqa ma'lumoti va kamida bitta mushuk rasmi "
            "kerak. E'lon admin tasdig‘idan keyin kanalga joylanadi."
        )
    if any(word in normalized for word in ("sotildi", "berildi", "o'chir", "ochir")):
        return (
            "Mushuk sotilgan yoki berilgan bo‘lsa, /elonlarim buyrug‘i orqali "
            "e'lonni «Sotildi» yoki «Berildi» deb belgilang."
        )
    if any(word in normalized for word in ("hadyaga", "bepul", "asrab", "adopt")):
        return (
            "«Hadyaga» — mushukni bepul berish e'loni. Mushukni olishdan oldin "
            "egasi bilan bog‘lanib, sog‘ligi va emlashlari haqida so‘rang."
        )
    if any(word in normalized for word in ("qoid", "qoida", "taqiql", "nima kerak")):
        return (
            "E'lon haqiqiy va aniq bo‘lishi, faqat mushuk rasmlaridan iborat bo‘lishi "
            "kerak. So‘kinish, haqorat va reklama taqiqlangan. Firibgarlik yoki yolg‘on "
            "ma'lumot aniqlansa, e'lon olib tashlanadi."
        )
    if any(word in normalized for word in ("qidir", "mushuk bor", "available", "topaman")):
        return "«🔍 Mushuk qidirish» bo‘limi orqali hudud va e'lon turini tanlab faol e'lonlarni ko‘ring."
    if any(word in normalized for word in ("salom", "assalom", "rahmat")):
        return "Assalomu alaykum! Mushuklar bozoriga xush kelibsiz."
    return None


async def ask_openai(api_key: str, question: str) -> str | None:
    prompt = (
        "Siz mushuklarni asrab olish va sotish hamjamiyati uchun o‘zbek tilidagi "
        "yordamchisiz. Qisqa, amaliy va xavfsiz javob bering. Tibbiy yoki huquqiy "
        "masalalarda mutaxassisga murojaat qilishni tavsiya qiling. Hech qanday "
        "telefon raqam, username yoki kontakt o‘ylab topmang.\n\n"
        f"Foydalanuvchi savoli: {question}"
    )
    payload = json.dumps(
        {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 300,
        }
    ).encode()

    def call_api() -> str | None:
        req = request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=15) as response:
                body = json.loads(response.read().decode())
            return body["choices"][0]["message"]["content"].strip()
        except Exception:
            return None

    return await asyncio.to_thread(call_api)
