"""Video uchun fon musiqasi (120 BPM, quvnoq pop ritm) — mualliflik huquqi muammosiz, kod bilan yaratiladi.
Ishlatish: python3 make-music.py <soniya> <chiqish.wav> '[3, 7, ...]'   (oxirgisi — sahna almashish vaqtlari, «whoosh» uchun)
"""
import json
import sys
import wave

import numpy as np

SR = 44100
LEN = float(sys.argv[1])
OUT = sys.argv[2]
CUTS = json.loads(sys.argv[3]) if len(sys.argv) > 3 else []
BEAT = 0.5  # 120 BPM
N = int(SR * LEN)
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i : i + len(sig), 0] += sig * gain * l * 1.41
    mix[i : i + len(sig), 1] += sig * gain * r * 1.41


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.001, 0.12)


def clap():
    n = int(0.25 * SR)
    x = rng.standard_normal(n)
    x = np.convolve(x, np.ones(6) / 6, "same") - np.convolve(x, np.ones(40) / 40, "same")
    return x * env(n, 0.001, 0.06) * 0.8


def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR)
    x = rng.standard_normal(n)
    x = x - np.convolve(x, np.ones(4) / 4, "same")
    return x * env(n, 0.0005, 0.06 if open_ else 0.012)


def pluck(m, dur=0.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = note(m)
    s = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in range(1, 6))
    return s * env(n, 0.003, 0.11)


def bass(m, dur=0.24):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = note(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return s * np.minimum(1, t / 0.005) * np.exp(-t / 0.25)


def pad(ms, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * note(m) * t + np.sin(2 * np.pi * 5 * t) * 0.3) for m in ms)
    a = np.minimum(1, t / 0.3) * np.minimum(1, (dur - t) / 0.3)
    return s * a / len(ms)


def whoosh(dur=0.6):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    y = 0.0
    for i in range(n):  # o'sib boruvchi past chastota filtri
        k = 0.02 + 0.5 * (i / n) ** 2
        y += k * (x[i] - y)
        out[i] = y
    a = np.sin(np.pi * np.arange(n) / n) ** 2
    return out * a


# Akkordlar: C – G – Am – F (har biri 1 takt = 4 zarb)
CHORDS = [(60, 64, 67), (55, 59, 62, 67), (57, 60, 64), (53, 57, 60, 65)]
ROOTS = [36, 43, 45, 41]
beats = int(LEN / BEAT)
for b in range(beats):
    t = b * BEAT
    bar = (b // 4) % 4
    intro = b < 4  # birinchi takt — yengilroq
    outro = t >= LEN - 2
    if not intro or b % 2 == 0:
        add(kick(), t, 0.9)
    if b % 4 in (1, 3) and not intro:
        add(clap(), t, 0.35, 0.1)
    for h in range(2):
        add(hat(open_=(h == 1 and b % 2 == 1)), t + h * BEAT / 2, 0.12 if h else 0.07, 0.4)
    # bas: zarb oralig'ida
    if not intro:
        add(bass(ROOTS[bar]), t + BEAT / 2, 0.45)
        if b % 2:
            add(bass(ROOTS[bar] + 12, 0.12), t + BEAT * 0.75, 0.2)
    # arpedjio (16-lik notalar)
    ch = CHORDS[bar]
    for s in range(4):
        m = ch[(b * 4 + s) % len(ch)] + (12 if (b * 4 + s) % 8 >= 6 else 0)
        add(pluck(m), t + s * BEAT / 4, 0.16 if not outro else 0.1, -0.3 + 0.2 * s)
    if b % 4 == 0:
        add(pad([m - 12 for m in ch], 4 * BEAT), t, 0.09)

# Sahna almashishlarida «whoosh»
for c in CUTS:
    add(whoosh(), c - 0.45, 0.22, 0.0)
# Oxirida yakuniy akkord
add(pad([48, 60, 64, 67, 72], 2.0), LEN - 2.0, 0.18)

# Siqish va ovozni me'yorlash, oxirida so'nish
mix = np.tanh(mix * 1.2)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.8
fade = np.ones(N)
fn = int(1.2 * SR)
fade[-fn:] = np.linspace(1, 0, fn)
fade[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
mix *= fade[:, None]
data = (mix * 32767).astype(np.int16)
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print("musiqa:", OUT)
