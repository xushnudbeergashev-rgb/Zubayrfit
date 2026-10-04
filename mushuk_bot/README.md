# Mushuklar bozori — Telegram bot

O‘zbek tilidagi Telegram bot (aiogram 3 + SQLite): mushukni hadyaga berish,
sotish va qidirish. Har bir e'lon AI tekshiruvi va admin tasdig‘idan o‘tadi.

## Sozlash

`.env.example` ni `.env` ga nusxalang (yoki Replit Secrets'ga kiriting):

| O‘zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `BOT_TOKEN` | ha | @BotFather tokeni |
| `CHANNEL_ID` | ha | Kanal ID (`-100…`) yoki `@username` |
| `ADMIN_USER_IDS` | yo‘q | E'lonlarni tasdiqlovchi adminlar ID'lari (vergul bilan), standart: `8278830955` |
| `OPENAI_API_KEY` | yo‘q | Rasm (GPT-4o Vision) va matn (Moderation API) tekshiruvi, AI javoblar |
| `ADMIN_CONTACT`, `CHANNEL_HANDLE`, `PAYMENT_CARD`, `PAYMENT_CARD_OWNER`, `LISTING_FEE`, `DB_PATH` | yo‘q | Standart qiymatlar `.env.example` da |

Botni kanalga **post yuborish, tahrirlash va o‘chirish** huquqi bilan admin qiling.

## Ishga tushirish

```bash
pip install -r requirements.txt
python main.py
```

Testlar: `pip install pytest && python -m pytest`

## Serverga joylash (24/7)

Bot faqat jarayon ishlab turganda javob beradi, shuning uchun uni doimiy
ishlaydigan serverga qo‘ying.

**Docker** (VPS, Railway, Render worker va h.k.):

```bash
cd mushuk_bot
docker build -t mushuk-bot .
docker run -d --restart=always --env-file .env -v mushuk-data:/app/data mushuk-bot
```

`-v mushuk-data:/app/data` bazani saqlab qoladi; usiz har qayta joylashda
e'lonlar o‘chib ketadi.

**Replit**: repo ildizidagi `.replit` tayyor. Secrets'ga `BOT_TOKEN`,
`CHANNEL_ID`, `OPENAI_API_KEY` ni kiriting va **Deploy → Reserved VM** ni
tanlang (Autoscale polling bot uchun yaramaydi). Diqqat: Replit deploy fayl
tizimi har qayta deploy qilinganda tiklanadi, ya'ni `data/cats.db` o‘chadi.
Bazani saqlash muhim bo‘lsa, Docker + volume yoki VPS afzal.

## Imkoniyatlar

- **Menyu** faqat 3 bo‘lim: 📢 E'lon berish, 🔍 Mushuk qidirish, ❓ Savol-Javob (AI).
  Admin kontakti (`@zby_r`) faqat foydalanuvchi «admin» haqida so‘raganda beriladi.
- **Moderatsiya**: har bir rasm GPT-4o Vision orqali tekshiriladi, mushuk bo‘lmasa
  rad etiladi. Zot faqat tugmalar orqali tanlanadi (Siam, Meykun, Boshqa/Oddiy,
  Zotdor emas). Narx va izoh OpenAI Moderation API hamda lokal qoidalar
  (so‘kinish, havola/reklama) bilan tekshiriladi.
- **To‘lov**: «Hadyaga» bepul, «Sotiladi» 7 000 so‘m. Foydalanuvchi chek rasmini
  yuboradi; bitta chekni ikki marta ishlatib bo‘lmaydi. Kutilayotgan e'lonlar
  (2 ta) va kunlik e'lonlar (3 ta) soni cheklangan.
- **Admin tasdig‘i**: har bir e'lon adminlarga 🟢 Tasdiqlash / 🔴 Rad etish
  tugmalari bilan boradi; tasdiqlangach kanalga joylanadi.
- **Kanal posti** oxirida kanal va bot havolasi (footer) bo‘ladi.
- **Sotildi/Berildi**: `/elonlarim` yoki tasdiq xabaridagi tugma orqali. Kanal
  postidan kontaktlar olib tashlanadi, «✅ SOTILDI/BERILDI» belgisi qo‘shiladi va
  kanalga qisqa bildirishnoma yuboriladi.
- **30 kunlik lifecycle**: 30 kundan keyin bot egasidan e'lon dolzarbligini so‘raydi.
  «Yo‘q» yoki 3 kun ichida javob bo‘lmasa, post yuqoridagidek tahrirlanadi va e'lon
  faol emas deb belgilanadi.

## Eski e'lonlarni import qilish

Bot API kanal tarixini o‘qiy olmaydi, shuning uchun Telegram Desktop eksportidan
foydalaniladi: kanal → ⋮ → *Export chat history* → format **JSON**.

```bash
python import_channel.py path/to/result.json --channel-username mushuklar_bozori --dry-run
python import_channel.py path/to/result.json --channel-username mushuklar_bozori
```

Skript e'lon turini, hududni, zotni, narxni va kontaktni matndan aniqlaydi;
yakunlangan («sotildi») va e'lon bo‘lmagan postlarni, shuningdek bazada borlarini
o‘tkazib yuboradi. Qayta ishga tushirish xavfsiz. Import qilingan e'lonlarning
egasi noma'lum, shuning uchun 30 kunlik muddat import vaqtidan boshlanadi va
muddat tugagach ular avtomatik yakunlanadi.

## Tuzilma

- `cat_bot/handlers.py` — menyu, e'lon FSM, to‘lov, admin tasdig‘i, qidiruv, Q&A
- `cat_bot/moderation.py` — OpenAI Vision/Moderation va lokal matn qoidalari
- `cat_bot/captions.py` — post, preview va admin matnlari, footer
- `cat_bot/channel.py` — kanalga joylash, tahrirlash, yakunlash
- `cat_bot/lifecycle.py` — 30 kunlik tekshiruv (har soatda)
- `cat_bot/importer.py`, `import_channel.py` — eski postlarni import qilish
- `cat_bot/database.py` — SQLite sxemasi va eski bazani avtomatik migratsiya
