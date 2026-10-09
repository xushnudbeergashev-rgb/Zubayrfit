"""Ovozli izoh (erkak ovozi) — o'zbekcha matnni sahnalarga moslab o'qiydi.

Bu muhitda o'zbek tilidagi tayyor TTS modeli yo'q. Shuning uchun eng yaqin turkiy til — qozoq tilining
erkak ovozi (Piper «kk_KZ-issai-high», ISSAI KazakhTTS) ishlatiladi: o'zbekcha lotin matn qozoq kirilliga
transliteratsiya qilinadi. Talaffuzda yengil qozoqcha urg'u bo'ladi.

Ishlatish: python3 make-voice.py <model_papkasi> <chiqish.wav> [speaker_id]
"""
import json
import re
import sys
import wave

import numpy as np
import sherpa_onnx

MODEL_DIR = sys.argv[1]
OUT = sys.argv[2]
SPEAKER = int(sys.argv[3]) if len(sys.argv) > 3 else 1  # 1 = ISSAI_KazakhTTS_M1_Iseke (erkak)
LEN = 30.0
SR_OUT = 44100

# (boshlanish soniyasi, oxirgi chegara, matn) — sahnalar vaqtiga mos (stage.html, 30 soniyalik jadval)
LINES = [
    (0.25, 2.9, "Mushukka yangi uy kerakmi?"),
    (3.25, 6.9, "Hududingizdagi mushuklarni toping."),
    (7.2, 10.4, "Egasi bilan bir bosishda bog'laning."),
    (10.7, 14.4, "Hadyaga e'lon berish mutlaqo bepul."),
    (14.7, 17.4, "Admin tekshiradi, e'lon kanalga chiqadi."),
    (17.7, 20.4, "Savollarga yordamchi javob beradi."),
    (20.7, 23.9, "Mushuk uy topsa, belgilab qo'ying."),
    (24.2, 26.9, "Shikoyat tugmasi sizni himoya qiladi."),
    (27.1, 29.9, "Hadyaga mushuklar botiga kiring!"),
]


def translit(text):
    """O'zbek lotin → qozoq kirill (taxminiy, talaffuzga yaqinlashtirish uchun)."""
    t = text.lower()
    t = re.sub(r"[‘’ʻʼ`]", "'", t)
    t = t.replace("o'", "о").replace("g'", "ғ")
    for a, b in [("sh", "ш"), ("ch", "ч"), ("ng", "ң"), ("yo", "йо"), ("yu", "ю"), ("ya", "я"), ("ye", "е")]:
        t = t.replace(a, b)
    t = re.sub(r"(^|[\s,.!?])e", lambda m: m.group(1) + "э", t)  # so'z boshidagi e → э
    table = {"a": "а", "b": "б", "d": "д", "e": "е", "f": "ф", "g": "г", "h": "һ", "i": "і", "j": "ж", "k": "к", "l": "л",
             "m": "м", "n": "н", "o": "о", "p": "п", "q": "қ", "r": "р", "s": "с", "t": "т", "u": "ұ", "v": "в", "x": "х",
             "y": "й", "z": "з", "c": "с", "'": ""}
    return "".join(table.get(ch, ch) for ch in t)


def f0_median(x, sr):
    """Ovoz balandligi (Hz) — erkak ~85–155, ayol ~165–255. Avtokorrelyatsiya bo'yicha."""
    f = []
    n = int(0.04 * sr)
    for i in range(0, len(x) - n, n):
        w = x[i : i + n] - np.mean(x[i : i + n])
        if np.sqrt(np.mean(w ** 2)) < 0.02:
            continue
        ac = np.correlate(w, w, "full")[n - 1 :]
        lo, hi = int(sr / 400), int(sr / 60)
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.3 * ac[0]:
            f.append(sr / k)
    return float(np.median(f)) if f else 0.0


cfg = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(
        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
            model=f"{MODEL_DIR}/{MODEL_DIR.rstrip('/').split('/')[-1].replace('vits-piper-', '')}.onnx",
            tokens=f"{MODEL_DIR}/tokens.txt", data_dir=f"{MODEL_DIR}/espeak-ng-data",
            length_scale=1.0, noise_scale=0.55, noise_scale_w=0.7),
        num_threads=4),
)
tts = sherpa_onnx.OfflineTts(cfg)
track = np.zeros(int(LEN * SR_OUT), dtype=np.float32)
report = []
for start, end, text in LINES:
    audio = tts.generate(translit(text), sid=SPEAKER, speed=1.0)
    x = np.array(audio.samples, dtype=np.float32)
    sr = audio.sample_rate
    # boshidagi va oxiridagi jimlikni olib tashlash
    idx = np.where(np.abs(x) > 0.01)[0]
    x = x[max(0, idx[0] - int(0.02 * sr)) : idx[-1] + int(0.05 * sr)]
    # sahnaga sig'masa — tezlashtiriladi (ko'pi bilan 1.25x), sig'sa — tabiiy tezlikda
    room = end - start
    speed = max(1.0, (len(x) / sr) / room)
    if speed > 1.0:
        audio = tts.generate(translit(text), sid=SPEAKER, speed=min(1.25, speed * 1.02))
        x = np.array(audio.samples, dtype=np.float32)
        idx = np.where(np.abs(x) > 0.01)[0]
        x = x[max(0, idx[0] - int(0.02 * sr)) : idx[-1] + int(0.05 * sr)]
    # 44.1 kHz ga o'tkazish (chiziqli interpolyatsiya)
    y = np.interp(np.arange(0, len(x), sr / SR_OUT), np.arange(len(x)), x).astype(np.float32)
    i = int(start * SR_OUT)
    y = y[: len(track) - i]
    track[i : i + len(y)] += y
    report.append({"text": text, "sec": round(len(y) / SR_OUT, 2), "room": round(room, 2), "f0": round(f0_median(x, sr))})

track /= np.max(np.abs(track)) + 1e-9
track *= 0.95
with wave.open(OUT, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR_OUT)
    w.writeframes((track * 32767).astype(np.int16).tobytes())
print(json.dumps(report, ensure_ascii=False, indent=1))
