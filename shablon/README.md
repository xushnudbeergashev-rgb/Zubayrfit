# Kafe sayti shabloni

`index.html` — saytning o'zi, `rasmlar/` — taom rasmlari, `og.jpg` — havola
Telegram'da tashlanganda chiqadigan rasm. Server yoki dasturlash kerak emas.

## Ikki rejim

- `ordering: false` (hozirgi holat): faqat menyu — narxlar, rasmlar, ish vaqti, manzil, "Qo'ng'iroq" va "Marshrut". Google Maps uchun shu yetarli.
- `ordering: true`: savatcha, yetkazish hududlari, to'lov turi va Telegram orqali buyurtma qo'shiladi.

## Yangi mijoz uchun sayt tayyorlash (20–30 daqiqa)

1. `shablon` papkasini nusxalang.
2. Mijozning taom rasmlarini `rasmlar/` ga qo'ying. Kvadrat (1:1), kengligi
   600–800px, WebP yoki JPG. Hero rasmi tik (4:5), masalan 800×1000.
   [squoosh.app](https://squoosh.app) da siqib oling: har biri 30–80 KB.
3. `index.html` dagi `CONFIG` blokini to'ldiring:
   - nom, telefon, `telegram` (buyurtmalar shu akkauntga keladi), `city`, `coords`
   - ish vaqti (`hours`), yetkazish vaqti va hududlari (`delivery.zones`: narx, minimal buyurtma, qaysi summadan bepul)
   - to'lov turlari (`payments`), aksiya (`promo`, tugash sanasi bilan), Instagram (`social`)
   - menyu: narx, `photo`, `weight`, `tag` (`hit` | `new` | `spicy`), tugagan taom uchun `available: false`
   - "Eng ko'p buyurtma qilinadi" (`hits`) va kombo (`combo`)
   - `rating`, `reviewsCount`, `reviews`: biznesning **Google'dagi haqiqiy** reytingi va
     sharhlaridan qo'lda ko'chiring. O'ylab topilgan sharh qo'ymang: bu ma'lumot
     Google'ga ham yuboriladi.
   - `maker`: o'zingizning ismingiz va Telegram havolangiz (saytning pastida chiqadi)
4. `<head>` dagi `<title>`, `description` va `og:` teglarini yangilang. `og:image`
   to'liq manzil bo'lsin (`https://domen.uz/og.jpg`), rasm 1200×630.
   Ish vaqti 24/7 bo'lmasa, `eyebrow` va `og:title` dagi "kechayu kunduz / 24/7" ni ham o'zgartiring.
5. `design` maydonida dizaynni tanlang: `yashil`, `olov` yoki `rishton`.
   `<head>` dagi shriftlar havolasida faqat shu dizayn shriftlarini qoldiring (sayt tezroq ochiladi).
6. Mijozga topshirishdan oldin yuqoridagi "Dizayn / UZ·RU" chiziqni
   (`<div class="demo">`) o'chiring yoki faqat til tugmalarini qoldiring.
7. Netlify yoki Cloudflare Pages'ga yuklang, domen ulang, Google Business
   profilidagi "Website" maydoniga havolani qo'ying.

## Buyurtma qanday keladi

Mijoz savatchada "Telegram'ga yuborish" ni bosadi. Kafening Telegram chati
buyurtma matni yozilgan holda ochiladi (raqam, taomlar, jami, to'lov, manzil),
mijoz faqat "Yuborish" ni bosadi. Buyurtmalar uchun alohida akkaunt oching:
Telegram Business'da avtomatik salom va tez javoblar ("#K3F2 qabul qilindi,
30 daqiqada") sozlash mumkin.

## Narxlarni egasi o'zi o'zgartirishi (ixtiyoriy)

Google Sheets'da `id`, `price`, `available` ustunli jadval oching (id: `l1`,
`b2`...). Fayl → Ulashish → Internetda e'lon qilish → CSV. Havolani
`pricesCsv` ga qo'ying. Sayt ochilganda narxlar va "tugagan" belgilari shu
jadvaldan olinadi. Jadval ochilmasa, fayldagi narxlar ishlatiladi.

## Bitta fayl (Telegram'da yuborish, internetsiz ko'rsatish)

```
python3 bitta-fayl.py        # -> dist/index.html, rasmlar ichiga joylangan
```

Bu faqat namoyish uchun. Haqiqiy saytda rasmlar alohida fayl bo'lib tursin.

## Nimalar bor

- 3 ta dizayn, har biri kunduzgi va tungi rejimda
- O'zbek va rus tili
- Katta hero rasm, "Eng ko'p buyurtma qilinadi" lentasi, kombo taklif, aksiya chizig'i
- Rasmli menyu; taom bosilsa katta rasm va miqdor tanlash oynasi ochiladi
- Savatcha: yetkazish hududlari, minimal buyurtma, bepul yetkazish chegarasi,
  to'lov turi (naqd, Click, Payme, karta), qaytim, mo'ljal
- Buyurtma kafe chatiga tayyor matn bo'lib boradi, buyurtma raqami bilan
- Kafe yopiq bo'lsa, buyurtma "oldindan buyurtma" bo'lib boradi
- "Hozir ochiq / Yopiq" belgisi (Toshkent vaqti bo'yicha)
- Google sharhlari bloki va "Sharh qoldiring" tugmasi
- Marshrut, Google Maps va Yandex Maps tugmalari
- Google uchun Schema.org: restoran, menyu va narxlar avtomatik qo'shiladi

## Namuna rasmlar haqida

`rasmlar/` dagi rasmlar [Open Images](https://storage.googleapis.com/openimages/web/index.html)
to'plamidan olingan, Flickr mualliflariniki, litsenziyasi CC BY 2.0. Ulardan
foydalanish uchun muallif nomini ko'rsatish shart. Shu sababli ular saytning
pastidagi "Rasmlar manbasi" bo'limida (`CONFIG.photoCredits`) yozilgan.

Haqiqiy mijozga topshirishda **mijozning o'z rasmlarini** qo'ying: menyudagi
taom mijoz oladigan taomga o'xshashi kerak. Telefonda 30 daqiqalik suratga
olishni xizmatingizga qo'shishingiz mumkin. Keyin `photoCredits: []` qilib
bo'shating.
