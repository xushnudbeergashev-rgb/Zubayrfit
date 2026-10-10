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
4. **Settings → Triggers → Cron Triggers**: `*/15 * * * *` (har 15 daqiqada). `0 * * * *` (har soatda) bilan ham ishlaydi, faqat navbat sekinroq tarqaladi.
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

## Fon vazifalari (cron)

Bepul tarifda bitta ishga tushishda taxminan 50 ta tashqi so'rov (Telegram va baza) qilish mumkin. Shuning uchun vazifalar o'z so'rovlarini sanaydi va 40 tadan oshmaydi. Ulgurilmagan ishlar keyingi ishga tushishda bajariladi, hech narsa jimgina yo'qolmaydi.

- To'lov muddati o'tgan e'lonlarni bekor qilish.
- To'lov muddati tugashiga 24 soat qolganda foydalanuvchiga eslatma.
- 6 soatdan ko'p tekshiruv kutayotgan e'lonlar va tekshirilmagan cheklar haqida adminlarga eslatma (har 6 soatda ko'pi bilan bir marta).
- **30 kunlik tekshiruv.** Kanalda 30 kun turgan e'lon egasidan "Hali dolzarbmi?" deb so'raladi. 3 kun ichida javob bo'lmasa, e'lon "Dolzarb emas" deb yopiladi va kanaldagi postdan kontaktlar olib tashlanadi. Savol faqat egasiga **yetib borgandan keyin** "so'raldi" deb belgilanadi. Telegram vaqtincha xato bersa, keyingi safar qayta urinadi. Egasi botni bloklagan bo'lsa (yoki xabar 5 marta yetmasa), e'lon 15 kundan keyin yopiladi. Kanaldan import qilingan postlar bu tekshiruvga kirmaydi, chunki ularning egasi botda yo'q.
- Vaqtinchalik yozuvlarni tozalash (`mg:`, `rcpt:`, `done:`).

## Shikoyatlar

- Bir kishi kuniga ko'pi bilan 5 ta shikoyat yubora oladi. Bitta e'longa esa bir marta.
- Adminga faqat e'lon bo'yicha **birinchi** shikoyat va e'lon **yashirilgani** haqida xabar boradi.
- 3 xil "ishonchli" odam shikoyat qilsa, e'lon ilovadan vaqtincha yashiriladi. Ishonchli odam: botda kamida 7 kundan beri bor va ban qilinmagan. Kanaldagi post o'zgarmaydi, egasiga xabar boradi.
- Admin xabardagi tugmalar bilan e'lonni yopadi, ilovaga qaytaradi ("↩️ Ilovaga qaytarish") yoki egasini ban qiladi. Qaytarilgandan keyin eski shikoyatlar hisobga olinmaydi.

## Username tekshiruvi

Telegram boshqa odamning username'i kimga tegishli ekanini aniqlashga ruxsat bermaydi. Shuning uchun formadagi username foydalanuvchi profilidagidan farq qilsa, adminga `⚠️ Username egasiniki bo'lmasligi mumkin` degan ogohlantirish chiqadi. Rad etish sabablari orasida "Ko'rsatilgan Telegram username sizniki emas" bandi bor.

## Admin: e'lonlarni boshqarish (Mini App)

Admin ilovada istalgan e'lonni ochsa, "Admin boshqaruvi" bloki chiqadi:

- **Tahrirlash.** Bot joylagan e'lonning maydonlari tahrirlanadi va kanaldagi post ham yangilanadi. Kanaldan qo'shilgan e'lonning esa post matni tahrirlanadi (qalin yozuv kabi formatlash yo'qoladi).
- **Berildi / Sotildi / Dolzarb emas.** Kanaldagi post tahrirlanadi. "Berildi" va "Sotildi"da kanalga qisqa javob ham yoziladi, "Dolzarb emas"da esa yozilmaydi.
- **Yana faol qilish.** Yopilgan e'lon qaytadan ochiladi, postga kontaktlar qaytadi va "✅ Berildi" javobi o'chiriladi.
- **O'chirish.** E'lon ilovadan olinadi. Xohlasangiz, kanaldagi postni ham o'chirish mumkin, buning uchun botda "Xabarlarni o'chirish" huquqi bo'lishi kerak.

Qidiruv sahifasida faqat adminga "Faol / Berilgan va yopilgan / Shikoyatli" filtri ko'rinadi.

## Kanaldan avtomatik qo'shish

Kanalga admin o'zi joylagan post ilovaga **faqat** quyidagi ikki shart bajarilsa qo'shiladi:
- postda rasm yoki video bor;
- matnida `#hadyaga`, `#sotiladi` yoki `#reklama` hashtagi bor.

Oddiy xabarlar ("Assalomu alaykum...", e'lon bo'lmagan postlar) qo'shilmaydi.
