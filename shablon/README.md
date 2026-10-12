# Kafe sayti shabloni

`index.html` — saytning o'zi, `rasmlar/` — taom rasmlari, `og.jpg` — havola
Telegram'da tashlanganda chiqadigan rasm. Server yoki dasturlash kerak emas.

## Yangi mijoz uchun sayt tayyorlash (15–20 daqiqa)

1. `shablon` papkasini nusxalang.
2. Mijozning taom rasmlarini `rasmlar/` ga qo'ying. Kvadrat (1:1), kengligi
   600–800px, WebP yoki JPG. Hero rasmi tik (4:5), masalan 960×1200.
   [squoosh.app](https://squoosh.app) da siqib oling: har biri 50–100 KB.
3. `index.html` dagi `CONFIG` blokini o'zgartiring: nom, telefon, Telegram,
   ish vaqti, menyu, narxlar, `photo` maydonlari, manzil, xarita havolalari,
   "Ko'p buyurtma qilinadi" (`hits`) va kombo (`combo`).
4. `<head>` dagi `<title>`, `description` va `og:` teglarini yangilang.
   `og.jpg` ni 1200×630 o'lchamda almashtiring.
5. `design` maydonida dizaynni tanlang: `yashil`, `olov` yoki `rishton`.
6. Mijozga topshirishdan oldin yuqoridagi "Dizayn / UZ·RU" chiziqni
   (`<div class="demo">`) o'chiring yoki faqat til tugmalarini qoldiring.
7. Netlify yoki Cloudflare Pages'ga yuklang, domen ulang, Google Business
   profilidagi "Website" maydoniga havolani qo'ying.

Bitta fayl kerak bo'lsa (Telegram'da yuborish, internetsiz ko'rsatish):

```
python3 bitta-fayl.py        # -> dist/index.html, rasmlar ichiga joylangan
```

## Nimalar bor

- 3 ta dizayn, har biri kunduzgi va tungi rejimda
- O'zbek va rus tili
- Katta hero rasm, "Ko'p buyurtma qilinadi" lentasi, kombo taklif
- Rasmli menyu; taom bosilsa katta rasm va miqdor tanlash oynasi ochiladi
- Savatcha, yetkazish narxi hisobi, buyurtmani Telegram'ga yuborish
- "Hozir ochiq / Yopiq" belgisi (Toshkent vaqti bo'yicha)
- Google sharhlari bloki va "Sharh qoldiring" tugmasi
- Google Maps va Yandex Maps tugmalari
- Google uchun Schema.org: restoran, menyu va narxlar avtomatik qo'shiladi

## Namuna rasmlar haqida

`rasmlar/` dagi rasmlar [Open Images](https://storage.googleapis.com/openimages/web/index.html)
to'plamidan olingan, Flickr mualliflariniki, litsenziyasi CC BY 2.0. Ulardan
foydalanish uchun muallif nomini ko'rsatish shart. Shu sababli ular saytning
pastidagi "Rasmlar manbasi" bo'limida (`CONFIG.photoCredits`) yozilgan.

Haqiqiy mijozga topshirishda **mijozning o'z rasmlarini** qo'ying: menyudagi
taom mijoz oladigan taomga o'xshashi kerak. Keyin `photoCredits: []` qilib
bo'shating.

`googleReview` maydoniga biznesning haqiqiy sharh havolasini qo'ying
(Google Business Profile → "Sharh so'rash" → havolani nusxalash).
