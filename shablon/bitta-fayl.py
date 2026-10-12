"""Saytni rasmlari bilan birga bitta HTML faylga yig'adi.

Ishlatish:
    python3 bitta-fayl.py                 # -> dist/index.html
    python3 bitta-fayl.py chiqish.html

index.html ichidagi "rasmlar/..." havolalari data: URI ga aylantiriladi,
shuning uchun natija faylni Telegram'da yuborish yoki istalgan joyda
internetsiz ochish mumkin. Asl index.html o'zgarmaydi.
"""
import base64
import mimetypes
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
src = (ROOT / "index.html").read_text(encoding="utf-8")
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist" / "index.html"

cache = {}


def inline(match):
    rel = match.group(1)
    if rel not in cache:
        path = ROOT / rel
        if not path.is_file():
            print("topilmadi:", rel)
            return match.group(0)
        mime = mimetypes.guess_type(path.name)[0] or "image/webp"
        cache[rel] = "data:%s;base64,%s" % (mime, base64.b64encode(path.read_bytes()).decode())
    return '"' + cache[rel] + '"'


html = re.sub(r'"(rasmlar/[^"]+)"', inline, src)
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(html, encoding="utf-8")
print("%s: %d ta rasm, %.0f KB" % (out, len(cache), out.stat().st_size / 1024))
