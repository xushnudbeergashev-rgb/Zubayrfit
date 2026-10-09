"""Ovozli izoh + musiqa: gap ketayotganda musiqa avtomatik pasayadi (ducking).
Ishlatish: python3 mix-audio.py <musiqa.wav> <ovoz.wav> <chiqish.wav>
"""
import sys
import wave

import numpy as np


def read(path):
    with wave.open(path) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        x = x.reshape(-1, w.getnchannels())
        return x if x.shape[1] == 2 else np.repeat(x, 2, axis=1), w.getframerate()


music, sr = read(sys.argv[1])
voice, sr2 = read(sys.argv[2])
assert sr == sr2, "namuna chastotasi bir xil bo'lsin"
n = min(len(music), len(voice))
music, voice = music[:n], voice[:n]

# Ovoz bor-yo'qligi konverti: 20 ms bo'laklar bo'yicha, tez pasayish (80 ms), sekin tiklanish (500 ms)
hop = int(0.02 * sr)
lvl = np.array([np.sqrt(np.mean(voice[i:i + hop, 0] ** 2)) for i in range(0, n, hop)])
active = (lvl > 0.02).astype(float)
envl = np.zeros_like(active)
a_dn, a_up = 1 - np.exp(-0.02 / 0.08), 1 - np.exp(-0.02 / 0.5)
for i in range(len(active)):
    prev = envl[i - 1] if i else 0
    envl[i] = prev + (a_dn if active[i] > prev else a_up) * (active[i] - prev)
envl = np.repeat(envl, hop)[:n]
gain = 0.55 - 0.33 * envl  # gap yo'q: 0.55, gap ketayotganda: ~0.22

out = music * gain[:, None] + voice * 1.0
out /= np.max(np.abs(out)) + 1e-9
out *= 0.9
with wave.open(sys.argv[3], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(sr)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("aralashma:", sys.argv[3])
