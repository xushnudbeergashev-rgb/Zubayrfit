# ZubayrFit — Telegram fitnes bot 💪

O'zbek tilidagi fitnes yordamchi bot (Python, [aiogram 3](https://docs.aiogram.dev)).

## Imkoniyatlar
- 🏋️ **Mashg'ulot rejalari** — boshlang'ich / o'rta / yuqori daraja uchun haftalik reja
- ⚖️ **TVI (BMI) hisoblash** — vazn va bo'y bo'yicha
- 🔥 **Kaloriya hisoblash** — Mifflin-St Jeor formulasi: saqlash, ozish, massa yig'ish va oqsil me'yori
- 💡 **Kunlik maslahat**
- `/start`, `/help`, `/cancel` buyruqlari

## Ishga tushirish

1. Telegram'da [@BotFather](https://t.me/BotFather) ga `/newbot` yozing va token oling.
2. Kompyuteringizda:

```bash
pip install -r requirements.txt
export BOT_TOKEN="123456:ABC..."   # Windows: set BOT_TOKEN=123456:ABC...
python bot.py
```

Yoki Docker bilan:

```bash
docker build -t zubayrfit .
docker run -d --restart=always -e BOT_TOKEN="123456:ABC..." zubayrfit
```

Bot doimiy ishlashi uchun uni serverda (VPS, Railway, Render, PythonAnywhere va h.k.) ishga tushiring.

## Testlar

```bash
pip install pytest
python -m pytest
```
