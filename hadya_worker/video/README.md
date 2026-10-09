# Promo video (Instagram Reels / Telegram)

1080×1920, 30 kadr/s, musiqa bilan. Ikki xil uzunlikda: 30 va 15 soniya.

## Qayta yig'ish

```bash
cd hadya_worker
node build.mjs                    # dist/worker.js
cd video
node capture-app.mjs              # ilova ekranlarini suratga oladi → shots/
node render.mjs --len 30          # → out/hadya-30s.mp4
node render.mjs --len 15          # → out/hadya-15s.mp4
```

Kerak bo'ladi: Node.js 22+, Playwright (Chromium), ffmpeg, Python 3 + numpy.

## Haqiqiy e'lonlarni qo'yish

Hozir e'lonlarda chizilgan namuna mushuklar (`cats/1.jpg` … `cats/8.jpg`, `make-cats.mjs` yasagan) turibdi.

1. Kanaldagi e'lonlarning rasmlarini shu nomlar bilan `cats/` papkasiga qo'ying. Rasmlar kvadrat bo'lsa yaxshi.
2. Zoti, yoshi, hududi, narxi `capture-app.mjs` faylidagi `LISTINGS` ro'yxatida turibdi. Ularni haqiqiy e'lonlarga moslang.
3. `node capture-app.mjs`, keyin `node render.mjs --len 30 --demo 0` ni ishga tushiring. `--demo 0` "namuna e'lonlar" yozuvini olib tashlaydi.

Telefon raqamlar videoda ataylab soxta (`+998 00 000 00 00`) qilingan. Haqiqiy odamlarning raqami reklamaga chiqmasin.

## Fayllar

| Fayl | Nima |
|---|---|
| `stage.html` | Video sahnalari va animatsiyalar (brauzerda ochsa, real vaqtda o'ynaydi) |
| `capture-app.mjs` | Ilovani namuna ma'lumotlar bilan ishga tushirib, ekranlarini suratga oladi |
| `render.mjs` | Kadrma-kadr yig'ib, MP4 qiladi |
| `make-music.py` | Fon musiqasi (kod bilan yaratiladi, mualliflik huquqi muammosi yo'q) |
| `make-cats.mjs` | Namuna mushuk rasmlari |
