# Promo video (Instagram Reels / Telegram)

1080×1920, 30 kadr/s. Mayin fon musiqasi (`--music soft`, standart) va ixtiyoriy erkak ovozidagi izoh bilan.

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

## E'lonlar

`cats/1.jpg` … `cats/5.jpg` kanaldagi haqiqiy e'lonlarning rasmlari (kvadrat qilib kesilgan). Zoti, yoshi va hududi `capture-app.mjs` faylidagi `LISTINGS` ro'yxatida turibdi. Ular rasmga qarab **taxminan** yozilgan, haqiqiy ma'lumot bo'lsa, shu yerda o'zgartiring. `cats-demo/` papkasida esa chizilgan namuna rasmlar bor.

## Ovozli izoh (erkak ovozi)

O'zbek tilidagi ochiq TTS modeli topilmadi. Shuning uchun eng yaqin turkiy til, qozoq tilining erkak ovozi ishlatiladi: Piper `kk_KZ-issai-high`, 1-ovoz (ISSAI KazakhTTS M1). O'zbekcha matn qozoq kirilliga transliteratsiya qilinadi, shuning uchun talaffuzda yengil urg'u bor.

```bash
pip install sherpa-onnx numpy
curl -L https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-kk_KZ-issai-high.tar.bz2 | tar xj
python3 make-voice.py vits-piper-kk_KZ-issai-high out/voice.wav 1
node render.mjs --len 30 --demo 0 --voice out/voice.wav   # → out/hadya-30s-ovozli.mp4
```

Matn va har bir gapning vaqti `make-voice.py` dagi `LINES` ro'yxatida turibdi. Gap sahnaga sig'masa, avtomatik biroz tezlashtiriladi. Gap ketayotganda musiqa avtomatik pasayadi (`mix-audio.py`).

Telefon raqamlar videoda ataylab soxta (`+998 00 000 00 00`) qilingan. Haqiqiy odamlarning raqami reklamaga chiqmasin.

## Fayllar

| Fayl | Nima |
|---|---|
| `stage.html` | Video sahnalari va animatsiyalar (brauzerda ochsa, real vaqtda o'ynaydi) |
| `capture-app.mjs` | Ilovani namuna ma'lumotlar bilan ishga tushirib, ekranlarini suratga oladi |
| `render.mjs` | Kadrma-kadr yig'ib, MP4 qiladi |
| `make-music.py` | Fon musiqasi (kod bilan yaratiladi, mualliflik huquqi muammosi yo'q) |
| `make-cats.mjs` | Chizilgan namuna mushuk rasmlari (`cats-demo/`) |
| `make-voice.py` | Ovozli izoh (erkak ovozi) |
| `mix-audio.py` | Ovoz va musiqani aralashtirish |
