"""ZubayrFit uchun hisob-kitoblar va ma'lumotlar (Telegram'ga bog'liq emas)."""

import random

ACTIVITY_LEVELS = {
    "sedentary": ("Kam harakat (ofis ishi)", 1.2),
    "light": ("Yengil (haftada 1-3 mashg'ulot)", 1.375),
    "moderate": ("O'rtacha (haftada 3-5 mashg'ulot)", 1.55),
    "active": ("Faol (haftada 6-7 mashg'ulot)", 1.725),
    "very_active": ("Juda faol (og'ir jismoniy ish)", 1.9),
}

WORKOUT_PLANS = {
    "beginner": (
        "🟢 <b>Boshlang'ich daraja</b> (haftada 3 kun)\n\n"
        "<b>Dushanba — Butun tana</b>\n"
        "• Squat (o'tirib-turish) — 3×12\n"
        "• Tizzada otjimaniya — 3×10\n"
        "• Plank — 3×20 soniya\n"
        "• Joyida yurish — 5 daqiqa\n\n"
        "<b>Chorshanba — Kardio + qorin</b>\n"
        "• Tez yurish — 20 daqiqa\n"
        "• Krunch — 3×15\n"
        "• Velosiped mashqi — 3×20\n\n"
        "<b>Juma — Butun tana</b>\n"
        "• Lunges (hamla) — 3×10 (har oyoqqa)\n"
        "• Devorga otjimaniya — 3×12\n"
        "• Glute bridge — 3×15\n"
        "• Plank — 3×25 soniya\n\n"
        "💡 Mashg'ulotdan oldin 5 daqiqa qizing, keyin cho'ziling."
    ),
    "intermediate": (
        "🟡 <b>O'rta daraja</b> (haftada 4 kun)\n\n"
        "<b>Dushanba — Ko'krak va triceps</b>\n"
        "• Otjimaniya — 4×15\n"
        "• Brusda otjimaniya — 3×10\n"
        "• Almaz otjimaniya — 3×10\n\n"
        "<b>Seshanba — Oyoqlar</b>\n"
        "• Squat — 4×15\n"
        "• Bolgar split-squat — 3×10\n"
        "• Oyoq uchida ko'tarilish — 4×20\n\n"
        "<b>Payshanba — Orqa va biceps</b>\n"
        "• Turnikda tortilish — 4×6-8\n"
        "• Avstraliya tortilishi — 3×12\n"
        "• Superman — 3×15\n\n"
        "<b>Shanba — Kardio + qorin</b>\n"
        "• Yugurish — 25 daqiqa\n"
        "• Oyoq ko'tarish — 3×15\n"
        "• Plank — 3×45 soniya"
    ),
    "advanced": (
        "🔴 <b>Yuqori daraja</b> (haftada 5 kun)\n\n"
        "<b>Dushanba — Ko'krak/yelka</b>\n"
        "• Portlovchi otjimaniya — 5×10\n"
        "• Pike otjimaniya — 4×12\n"
        "• Brusda otjimaniya — 4×15\n\n"
        "<b>Seshanba — Oyoqlar</b>\n"
        "• Sakrab squat — 5×15\n"
        "• Pistol squat — 4×6 (har oyoqqa)\n"
        "• Sakrab hamla — 4×12\n\n"
        "<b>Chorshanba — HIIT</b>\n"
        "• Burpee, mountain climber, jumping jack — 40s ish / 20s dam, 5 davra\n\n"
        "<b>Juma — Orqa/qo'llar</b>\n"
        "• Tortilish — 5×10\n"
        "• Chin-up — 4×10\n"
        "• Muscle-up urinishlari — 5×3\n\n"
        "<b>Shanba — Chidamlilik</b>\n"
        "• Yugurish — 40 daqiqa\n"
        "• Hanging leg raise — 4×12\n"
        "• Plank — 3×90 soniya"
    ),
}

TIPS = [
    "💧 Kuniga kamida 2-2.5 litr suv iching.",
    "😴 Mushaklar uyquda tiklanadi — kuniga 7-9 soat uxlang.",
    "🥚 Har bir ovqatda oqsil bo'lsin: tuxum, go'sht, baliq, tvorog, dukkaklilar.",
    "🔥 Mashg'ulotdan oldin 5-10 daqiqa qizish jarohatdan saqlaydi.",
    "📈 Natija uchun izchillik muhim: haftasiga 3 marta muntazam — kuniga bir marta 3 soatdan yaxshiroq.",
    "🍬 Shakarli ichimliklarni kamaytiring — ular yashirin kaloriya manbai.",
    "🚶 Kuniga 8-10 ming qadam yurishga harakat qiling.",
    "🥗 Likopchaning yarmini sabzavot bilan to'ldiring.",
    "⏱ To'plamlar orasida 60-90 soniya dam oling.",
    "🧘 Mashg'ulotdan keyin cho'zilish mushak og'rig'ini kamaytiradi.",
]


def random_tip() -> str:
    return random.choice(TIPS)


def calc_bmi(weight_kg: float, height_cm: float) -> float:
    if weight_kg <= 0 or height_cm <= 0:
        raise ValueError("Vazn va bo'y musbat bo'lishi kerak")
    height_m = height_cm / 100
    return round(weight_kg / (height_m * height_m), 1)


def bmi_category(bmi: float) -> str:
    if bmi < 18.5:
        return "Vazn yetishmasligi"
    if bmi < 25:
        return "Normal vazn ✅"
    if bmi < 30:
        return "Ortiqcha vazn"
    return "Semizlik"


def calc_bmr(gender: str, weight_kg: float, height_cm: float, age: int) -> float:
    """Mifflin-St Jeor formulasi bo'yicha bazal metabolizm (kkal/kun)."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if gender == "male" else base - 161


def calc_calories(gender: str, weight_kg: float, height_cm: float, age: int, activity: str) -> dict:
    bmr = calc_bmr(gender, weight_kg, height_cm, age)
    maintain = bmr * ACTIVITY_LEVELS[activity][1]
    return {
        "bmr": round(bmr),
        "maintain": round(maintain),
        "lose": round(maintain - 500),
        "gain": round(maintain + 300),
        "protein_g": round(weight_kg * 1.8),
    }


def parse_number(text: str, low: float, high: float) -> float | None:
    """Foydalanuvchi kiritgan sonni tekshiradi; noto'g'ri bo'lsa None."""
    try:
        value = float(text.strip().replace(",", "."))
    except (ValueError, AttributeError):
        return None
    return value if low <= value <= high else None
