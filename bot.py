"""ZubayrFit — fitnes bo'yicha Telegram bot."""

import asyncio
import html
import logging
import os

from aiogram import Bot, Dispatcher, F, Router
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    Message,
    ReplyKeyboardMarkup,
)

import fitness

router = Router()

BTN_PLANS = "🏋️ Mashg'ulot rejalari"
BTN_BMI = "⚖️ TVI (BMI) hisoblash"
BTN_CALORIES = "🔥 Kaloriya hisoblash"
BTN_TIP = "💡 Kunlik maslahat"
BTN_HELP = "ℹ️ Yordam"

MAIN_MENU = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text=BTN_PLANS)],
        [KeyboardButton(text=BTN_BMI), KeyboardButton(text=BTN_CALORIES)],
        [KeyboardButton(text=BTN_TIP), KeyboardButton(text=BTN_HELP)],
    ],
    resize_keyboard=True,
)

HELP_TEXT = (
    "<b>ZubayrFit</b> — sizning shaxsiy fitnes yordamchingiz 💪\n\n"
    f"{BTN_PLANS} — darajangizga mos haftalik reja\n"
    f"{BTN_BMI} — tana vazni indeksi\n"
    f"{BTN_CALORIES} — kunlik kaloriya va oqsil me'yori\n"
    f"{BTN_TIP} — foydali maslahat\n\n"
    "Buyruqlar: /start, /help, /cancel"
)


class BmiForm(StatesGroup):
    weight = State()
    height = State()


class CalorieForm(StatesGroup):
    gender = State()
    age = State()
    weight = State()
    height = State()
    activity = State()


def inline(rows: list[list[tuple[str, str]]]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=t, callback_data=d) for t, d in row] for row in rows]
    )


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    name = html.escape(message.from_user.first_name) if message.from_user else "do'st"
    await message.answer(
        f"Assalomu alaykum, <b>{name}</b>! 👋\n\n"
        "<b>ZubayrFit</b> botiga xush kelibsiz. Quyidagi menyudan tanlang:",
        reply_markup=MAIN_MENU,
    )


@router.message(Command("help"))
@router.message(F.text == BTN_HELP)
async def cmd_help(message: Message) -> None:
    await message.answer(HELP_TEXT, reply_markup=MAIN_MENU)


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer("Bekor qilindi.", reply_markup=MAIN_MENU)


@router.message(F.text == BTN_TIP)
async def send_tip(message: Message) -> None:
    await message.answer(fitness.random_tip())


# --- Mashg'ulot rejalari ---

@router.message(F.text == BTN_PLANS)
async def show_plan_levels(message: Message) -> None:
    await message.answer(
        "Darajangizni tanlang:",
        reply_markup=inline([
            [("🟢 Boshlang'ich", "plan:beginner")],
            [("🟡 O'rta", "plan:intermediate")],
            [("🔴 Yuqori", "plan:advanced")],
        ]),
    )


@router.callback_query(F.data.startswith("plan:"))
async def show_plan(callback: CallbackQuery) -> None:
    level = callback.data.split(":", 1)[1]
    plan = fitness.WORKOUT_PLANS.get(level)
    if plan and callback.message:
        await callback.message.answer(plan)
    await callback.answer()


# --- TVI (BMI) ---

@router.message(F.text == BTN_BMI)
async def bmi_start(message: Message, state: FSMContext) -> None:
    await state.set_state(BmiForm.weight)
    await message.answer("Vazningizni kiriting (kg), masalan: <code>72</code>")


@router.message(BmiForm.weight)
async def bmi_weight(message: Message, state: FSMContext) -> None:
    weight = fitness.parse_number(message.text or "", 20, 400)
    if weight is None:
        await message.answer("Iltimos, 20 dan 400 gacha son kiriting (kg).")
        return
    await state.update_data(weight=weight)
    await state.set_state(BmiForm.height)
    await message.answer("Bo'yingizni kiriting (sm), masalan: <code>178</code>")


@router.message(BmiForm.height)
async def bmi_height(message: Message, state: FSMContext) -> None:
    height = fitness.parse_number(message.text or "", 80, 260)
    if height is None:
        await message.answer("Iltimos, 80 dan 260 gacha son kiriting (sm).")
        return
    data = await state.get_data()
    await state.clear()
    bmi = fitness.calc_bmi(data["weight"], height)
    await message.answer(
        f"⚖️ Sizning TVI: <b>{bmi}</b>\nHolat: <b>{fitness.bmi_category(bmi)}</b>\n\n"
        "Normal oraliq: 18.5 – 24.9",
        reply_markup=MAIN_MENU,
    )


# --- Kaloriya ---

@router.message(F.text == BTN_CALORIES)
async def cal_start(message: Message, state: FSMContext) -> None:
    await state.set_state(CalorieForm.gender)
    await message.answer(
        "Jinsingizni tanlang:",
        reply_markup=inline([[("👨 Erkak", "gender:male"), ("👩 Ayol", "gender:female")]]),
    )


@router.callback_query(CalorieForm.gender, F.data.startswith("gender:"))
async def cal_gender(callback: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(gender=callback.data.split(":", 1)[1])
    await state.set_state(CalorieForm.age)
    if callback.message:
        await callback.message.answer("Yoshingizni kiriting, masalan: <code>25</code>")
    await callback.answer()


@router.message(CalorieForm.gender)
async def cal_gender_text(message: Message) -> None:
    await message.answer("Iltimos, yuqoridagi tugmalardan birini bosing yoki /cancel.")


@router.message(CalorieForm.age)
async def cal_age(message: Message, state: FSMContext) -> None:
    age = fitness.parse_number(message.text or "", 10, 100)
    if age is None:
        await message.answer("Iltimos, 10 dan 100 gacha yosh kiriting.")
        return
    await state.update_data(age=int(age))
    await state.set_state(CalorieForm.weight)
    await message.answer("Vazningizni kiriting (kg):")


@router.message(CalorieForm.weight)
async def cal_weight(message: Message, state: FSMContext) -> None:
    weight = fitness.parse_number(message.text or "", 20, 400)
    if weight is None:
        await message.answer("Iltimos, 20 dan 400 gacha son kiriting (kg).")
        return
    await state.update_data(weight=weight)
    await state.set_state(CalorieForm.height)
    await message.answer("Bo'yingizni kiriting (sm):")


@router.message(CalorieForm.height)
async def cal_height(message: Message, state: FSMContext) -> None:
    height = fitness.parse_number(message.text or "", 80, 260)
    if height is None:
        await message.answer("Iltimos, 80 dan 260 gacha son kiriting (sm).")
        return
    await state.update_data(height=height)
    await state.set_state(CalorieForm.activity)
    await message.answer(
        "Faollik darajangizni tanlang:",
        reply_markup=inline([[(label, f"act:{key}")] for key, (label, _) in fitness.ACTIVITY_LEVELS.items()]),
    )


@router.callback_query(CalorieForm.activity, F.data.startswith("act:"))
async def cal_activity(callback: CallbackQuery, state: FSMContext) -> None:
    activity = callback.data.split(":", 1)[1]
    if activity not in fitness.ACTIVITY_LEVELS:
        await callback.answer()
        return
    data = await state.get_data()
    await state.clear()
    r = fitness.calc_calories(data["gender"], data["weight"], data["height"], data["age"], activity)
    if callback.message:
        await callback.message.answer(
            "🔥 <b>Kunlik kaloriya me'yoringiz</b>\n\n"
            f"Bazal metabolizm: <b>{r['bmr']}</b> kkal\n"
            f"Vaznni saqlash: <b>{r['maintain']}</b> kkal\n"
            f"Ozish uchun: <b>{r['lose']}</b> kkal\n"
            f"Massa yig'ish uchun: <b>{r['gain']}</b> kkal\n\n"
            f"🥩 Tavsiya etilgan oqsil: ~<b>{r['protein_g']}</b> g/kun",
            reply_markup=MAIN_MENU,
        )
    await callback.answer()


@router.message(CalorieForm.activity)
async def cal_activity_text(message: Message) -> None:
    await message.answer("Iltimos, yuqoridagi tugmalardan birini bosing yoki /cancel.")


@router.message()
async def fallback(message: Message) -> None:
    await message.answer("Tushunmadim 🤔 Menyudan tanlang yoki /help ni bosing.", reply_markup=MAIN_MENU)


async def main() -> None:
    logging.basicConfig(level=logging.INFO)
    token = os.getenv("BOT_TOKEN")
    if not token:
        raise SystemExit("BOT_TOKEN muhit o'zgaruvchisi o'rnatilmagan (@BotFather'dan oling).")
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)
    await bot.delete_webhook(drop_pending_updates=True)
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
