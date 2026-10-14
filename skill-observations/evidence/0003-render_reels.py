#!/usr/bin/env python3
"""Kitob reelslarini yasovchi: JSON ssenariy -> 1080x1920 MP4 (Instagram Reels / YouTube Shorts).

Foydalanish:
    python3 render_reels.py ssenariylar.json chiqish_papka [--brand "@kanal"] [--only 1]

JSON tuzilishi: {"reels": [{"title": "...", "slides": [{"text": "...", "highlight": "..."}]}]}
"""
import argparse
import json
import math
import os
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 30
FONT_DIR = "/usr/share/fonts/opentype/inter"
F_BOLD = os.path.join(FONT_DIR, "Inter-ExtraBold.otf")
F_SEMI = os.path.join(FONT_DIR, "Inter-SemiBold.otf")

WHITE = (245, 242, 235)
ACCENT = (255, 184, 72)
BOOK_LABEL = "«ATOM ODATLAR» · JEYMS KLIR"

# Matn xavfsiz hududi: Instagram/Shorts tugmalari o'ng va pastki qismni yopadi
TEXT_LEFT, TEXT_RIGHT = 70, W - 110
TEXT_TOP, TEXT_BOTTOM = 420, 1400


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


# ---------------------------------------------------------------- background
class Background:
    def __init__(self, seed=0):
        sw, sh = W // 4, H // 4
        yy, xx = np.mgrid[0:sh, 0:sw].astype(np.float32)
        self.xx, self.yy = xx * 4, yy * 4
        top = np.array([12, 15, 24], np.float32)
        bot = np.array([28, 19, 12], np.float32)
        g = (yy / sh)[..., None]
        self.base = top * (1 - g) + bot * g
        cx, cy = W / 2, H / 2
        d = np.sqrt(((self.xx - cx) / W) ** 2 + ((self.yy - cy) / H) ** 2)
        self.vignette = np.clip(1.15 - d * 1.1, 0.35, 1.0)[..., None]
        rng = np.random.default_rng(seed)
        # bitta statik, yengil grain: har kadrda o'zgaradigan shovqin fayl hajmini 10 barobar oshiradi
        self.grain = [rng.normal(0, 2.2, (H, W, 1)).astype(np.int16)]
        self.phase = seed * 1.7
        self.particles = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(1.5, 4.0),
                           rng.uniform(12, 40), rng.uniform(0, 6.28)) for _ in range(45)]

    def frame(self, t, i):
        t += self.phase
        img = self.base.copy()
        for (cx, cy, r, col, k) in (
            (540 + 260 * math.sin(t * 0.31), 760 + 300 * math.cos(t * 0.23), 820, (255, 160, 70), 0.30),
            (540 + 300 * math.cos(t * 0.19), 1350 + 200 * math.sin(t * 0.27), 700, (60, 110, 170), 0.22),
        ):
            d2 = ((self.xx - cx) ** 2 + (self.yy - cy) ** 2) / (r * r)
            img += np.exp(-d2)[..., None] * np.array(col, np.float32) * k
        img *= self.vignette
        small = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
        full = np.asarray(small.resize((W, H), Image.BILINEAR)).astype(np.int16)
        full += self.grain[i % len(self.grain)]
        return np.clip(full, 0, 255).astype(np.uint8)


# ---------------------------------------------------------------- text layout
def highlight_mask(text, highlight, words_spans):
    mask = [False] * len(words_spans)
    if not highlight:
        return mask
    start = text.lower().find(highlight.lower())
    if start < 0:
        return mask
    end = start + len(highlight)
    for k, (a, b) in enumerate(words_spans):
        if a < end and b > start:
            mask[k] = True
    return mask


def layout(text, highlight, is_hook):
    words, spans, pos = [], [], 0
    for w in text.split():
        a = text.index(w, pos)
        pos = a + len(w)
        if w in ("—", "–") and words:  # tire qator boshida qolmasin: oldingi so'zga yopishtiramiz
            words[-1] += "\u00a0" + w
            spans[-1] = (spans[-1][0], pos)
            continue
        words.append(w)
        spans.append((a, pos))
    hl = highlight_mask(text, highlight, spans)
    max_w = TEXT_RIGHT - TEXT_LEFT
    size = 112 if is_hook else 86
    while True:
        font = ImageFont.truetype(F_BOLD, size)
        space = font.getlength(" ")
        lines, cur, cur_w = [], [], 0.0
        for k, w in enumerate(words):
            ww = font.getlength(w)
            add = ww if not cur else cur_w + space + ww
            if cur and add > max_w:
                lines.append(cur)
                cur, cur_w = [k], ww
            else:
                cur.append(k)
                cur_w = add
        if cur:
            lines.append(cur)
        line_h = int(size * 1.22)
        too_wide = any(font.getlength(w) > max_w for w in words)
        if (len(lines) <= (5 if is_hook else 6) and len(lines) * line_h <= TEXT_BOTTOM - TEXT_TOP
                and not too_wide) or size <= 64:
            break
        size -= 4
    block_h = len(lines) * line_h
    y0 = (TEXT_TOP + TEXT_BOTTOM) // 2 - block_h // 2
    placed = []  # (word, x, y, highlighted)
    for li, line in enumerate(lines):
        lw = sum(font.getlength(words[k]) for k in line) + space * (len(line) - 1)
        x = TEXT_LEFT + (max_w - lw) / 2
        for k in line:
            placed.append((words[k], x, y0 + li * line_h, hl[k]))
            x += font.getlength(words[k]) + space
    return font, placed


def slide_duration(text, is_hook, is_last):
    n = len(text.split())
    d = 0.9 + 0.28 * n
    if is_hook:
        d = max(2.4, d)
    d = min(max(d, 2.2), 5.0)
    return d + (1.0 if is_last else 0.0)


# ---------------------------------------------------------------- rendering
def render_reel(reel, out_path, brand=None, seed=0, cover_path=None):
    slides = reel["slides"]
    durs = [slide_duration(s["text"], i == 0, i == len(slides) - 1) for i, s in enumerate(slides)]
    starts = np.cumsum([0] + durs[:-1])
    total = float(sum(durs))
    layouts = [layout(s["text"], s.get("highlight", ""), i == 0) for i, s in enumerate(slides)]
    bg = Background(seed)
    label_font = ImageFont.truetype(F_SEMI, 30)
    brand_font = ImageFont.truetype(F_SEMI, 34)

    ff = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
         "-shortest", "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-maxrate", "6M", "-bufsize", "12M", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out_path],
        stdin=subprocess.PIPE)

    n_frames = int(math.ceil(total * FPS))
    cover_saved = False
    for fi in range(n_frames):
        t = fi / FPS
        si = int(np.searchsorted(starts, t, side="right") - 1)
        lt = t - starts[si]
        dur = durs[si]
        frame = Image.fromarray(bg.frame(t, fi)).convert("RGBA")
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        dr = ImageDraw.Draw(layer)
        for (px, py, pr, sp, ph) in bg.particles:  # sekin ko'tariladigan chang zarralari
            yy = (py - sp * t) % (H + 40) - 20
            xx = px + 18 * math.sin(t * 0.6 + ph)
            al = int(60 + 50 * math.sin(t * 1.3 + ph))
            dr.ellipse([xx - pr, yy - pr, xx + pr, yy + pr], fill=(255, 220, 170, al))

        # yuqoridagi "stories" uslubidagi progress chiziqlari
        n, gap, bx0, bx1, by = len(slides), 10, 70, W - 70, 150
        seg = (bx1 - bx0 - gap * (n - 1)) / n
        for k in range(n):
            x0 = bx0 + k * (seg + gap)
            dr.rounded_rectangle([x0, by, x0 + seg, by + 7], 4, fill=(255, 255, 255, 60))
            fill = 1.0 if k < si else (min(lt / dur, 1.0) if k == si else 0.0)
            if fill > 0:
                dr.rounded_rectangle([x0, by, x0 + seg * fill, by + 7], 4, fill=(255, 255, 255, 230))
        lw = dr.textlength(BOOK_LABEL, font=label_font)
        dr.text(((W - lw) / 2, 195), BOOK_LABEL, font=label_font, fill=(255, 255, 255, 150))

        # so'zma-so'z paydo bo'ladigan matn
        font, placed = layouts[si]
        is_last = si == len(slides) - 1
        out_a = 1.0 if is_last else 1 - ease_out((lt - (dur - 0.28)) / 0.28)
        stagger = min(0.11, (dur * 0.45) / max(len(placed), 1))
        for k, (w, x, y, hl) in enumerate(placed):
            p = ease_out((lt - k * stagger) / 0.32)
            a = int(255 * p * out_a)
            if a <= 0:
                continue
            col = ACCENT if hl else WHITE
            dy = (1 - p) * 26
            dr.text((x, y + dy), w, font=font, fill=col + (a,))
            if hl and p > 0.5:
                # bir qatordagi ketma-ket belgilangan so'zlar ostida uzluksiz chiziq
                nxt = placed[k + 1] if k + 1 < len(placed) else None
                uw = font.getlength(w)
                if nxt and nxt[3] and nxt[2] == y:
                    uw = nxt[1] - x
                uy = y + font.size * 1.12
                dr.rectangle([x, uy, x + uw * ease_out((p - 0.5) * 2), uy + 6],
                             fill=ACCENT + (int(200 * out_a),))

        if brand:
            bw = dr.textlength(brand, font=brand_font)
            dr.text(((W - bw) / 2, 1430), brand, font=brand_font, fill=(255, 255, 255, 170))

        frame.alpha_composite(layer)
        rgb = frame.convert("RGB")
        if cover_path and not cover_saved and si == 0 and lt >= dur - 0.4:
            rgb.save(cover_path)
            cover_saved = True
        ff.stdin.write(rgb.tobytes())
    ff.stdin.close()
    if ff.wait() != 0:
        raise SystemExit(f"ffmpeg failed for {out_path}")
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script_json")
    ap.add_argument("out_dir")
    ap.add_argument("--brand", default=None, help="kanal nomi, masalan @kitob_uz")
    ap.add_argument("--only", type=int, default=None, help="faqat N-reelsni yasash (1 dan)")
    a = ap.parse_args()
    data = json.load(open(a.script_json, encoding="utf-8"))
    os.makedirs(a.out_dir, exist_ok=True)
    for i, reel in enumerate(data["reels"], 1):
        if a.only and i != a.only:
            continue
        mp4 = os.path.join(a.out_dir, f"reel_{i}.mp4")
        cover = os.path.join(a.out_dir, f"reel_{i}_muqova.png")
        total = render_reel(reel, mp4, a.brand, seed=i, cover_path=cover)
        print(f"{mp4}  {total:.1f}s")


if __name__ == "__main__":
    main()
