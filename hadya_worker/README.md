# Hadyaga mushuklar — Telegram bot + Mini App

Cloudflare Workers + D1 bazasida ishlaydi. Kanal: [@Hadyagamushuklar](https://t.me/Hadyagamushuklar), bot: [@hadyaga_mushuk_bot](https://t.me/hadyaga_mushuk_bot).

## Fayllar

| Fayl | Nima |
|---|---|
| `src/worker.js` | Server: bot, API, baza, cron vazifalari |
| `src/index.html` | Mini App (Telegram ichidagi ilova) |
| `build.mjs` | Ikkalasini bitta faylga yig'adi |
| `dist/worker.js` | **Cloudflare'ga joylanadigan tayyor fayl** |
| `test/worker.test.mjs` | Avtomatik testlar |

Kodni `src/` ichida o'zgartiring, keyin `node build.mjs` buyrug'ini ishga tushiring: `dist/worker.js` yangilanadi.

## Cloudflare'ga joylash

1. **Workers & Pages → worker'ingiz → Edit code**. Eski kodni o'chirib, `dist/worker.js` ichidagini to'liq joylang va **Deploy** tugmasini bosing.
2. **Settings → Variables and Secrets**:
   - `BOT_TOKEN` (Secret): BotFather bergan token.
   - `ADMIN_IDS` (Text): adminlarning ID'lari, vergul bilan: `111,222`.
   - `CHANNEL` (Text): `@Hadyagamushuklar`.
   - `ADMIN_CONTACT` (Text): foydalanuvchilarga ko'rsatiladigan admin, masalan `@username`.
   - `SETUP_KEY` (Secret): **yangi.** `/setup` sahifasining paroli. Uzun tasodifiy so'z bo'lsin.
   - `OPENAI_API_KEY` (Secret, ixtiyoriy) va `OPENAI_MODEL` (Text, ixtiyoriy).
3. **Settings → Bindings**: D1 baza, nomi `DB`.
4. **Settings → Triggers → Cron Triggers**: `0 * * * *` (har soatda).
5. Brauzerda `https://<worker-manzili>/setup?key=<SETUP_KEY>` ni oching. Yangi ustunlar va jadvallar shu yerda qo'shiladi.

## Testlar

Kompyuteringizda Node.js 22+ bo'lsa:

```bash
node build.mjs
node --test test/worker.test.mjs
```

Testlar haqiqiy Telegram'ga xabar yubormaydi: Telegram API ham, baza ham soxta (mock) nusxa bilan almashtiriladi.

## Admin buyruqlari

| Buyruq | Nima qiladi |
|---|---|
| `/admin` | Statistika va admin panel |
| `/narx 7000` | Pullik e'lon narxi |
| `/karta 8600 1234 1234 1234 Ism Familiya` | To'lov kartasi |
| `/berilgan`, `/oddiy` | Eski postlarni statistikaga kiritish rejimi |
| `/ban 123456789` yoki `/ban @username` | Foydalanuvchini bloklash: e'lon bera olmaydi, shikoyat va AI savol yubora olmaydi |
| `/unban 123456789` | Blokdan chiqarish |

## Har soatlik vazifalar (cron)

- To'lov muddati o'tgan e'lonlarni bekor qilish.
- To'lov muddati tugashiga 24 soat qolganda foydalanuvchiga eslatma.
- 6 soatdan ko'p tekshiruv kutayotgan e'lonlar va tekshirilmagan cheklar haqida adminlarga eslatma (har 6 soatda ko'pi bilan bir marta).
- **30 kunlik tekshiruv.** Kanalda 30 kun turgan e'lon egasidan "Hali dolzarbmi?" deb so'raladi. 3 kun ichida javob bo'lmasa, e'lon "Dolzarb emas" deb yopiladi va kanaldagi postdan kontaktlar olib tashlanadi. Kanaldan import qilingan postlar bu tekshiruvga kirmaydi, chunki ularning egasi botda yo'q.
- Vaqtinchalik yozuvlarni tozalash (`mg:`, `rcpt:`, `done:`).
