"""One-off import of existing channel posts into the bot database.

The Bot API cannot read channel history, so the source is a Telegram Desktop
export: Channel → ⋮ → Export chat history → format "Machine-readable JSON".
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
from typing import Any

from .captions import PHONE_RE, USERNAME_RE
from .database import REGIONS, Database, to_iso, utc_now


CLOSED_RE = re.compile(r"(sotildi|berildi|yakunlandi|продан|отдан)", re.IGNORECASE)
FREE_RE = re.compile(r"(hadya|bepul|tekin|бесплатно|даром|hadiya)", re.IGNORECASE)
SALE_RE = re.compile(r"(sotil|sotuv|narx|so['‘’`]?m\b|сум|цена|продаю)", re.IGNORECASE)
AGE_RE = re.compile(r"\b(\d+(?:[.,]\d+)?\s*(?:oylik|oy|yoshli|yosh|месяц\w*|год\w*|лет))", re.IGNORECASE)
PRICE_RE = re.compile(r"(\d[\d\s.,]*\s*(?:ming|mln|so['‘’`]?m|сум|\$|y\.?e\.?))", re.IGNORECASE)
FIELD_RE = r"^[^\n]*{label}[^\n:]*:\s*(?P<value>[^\n]+)"

BREED_ALIASES = {
    "Siam": ("siam", "сиам"),
    "Meykun": ("meykun", "meyn kun", "meyn-kun", "mainecoon", "maine coon", "мейн", "мейкун"),
}
GENDER_ALIASES = {
    "Erkak": ("erkak", "o'g'il", "ogil", "мальчик", "кот "),
    "Urg‘ochi": ("urg'ochi", "urgochi", "urg‘ochi", "qiz", "девочка", "кошка"),
}


def normalize(text: str) -> str:
    return (
        text.lower()
        .replace("‘", "'")
        .replace("’", "'")
        .replace("`", "'")
        .replace("ʻ", "'")
        .replace("ʼ", "'")
    )


def flatten_text(raw: Any) -> str:
    if isinstance(raw, str):
        return raw
    if isinstance(raw, list):
        return "".join(
            part if isinstance(part, str) else str(part.get("text", "")) for part in raw
        )
    return ""


def field_value(text: str, *labels: str) -> str | None:
    for label in labels:
        match = re.search(
            FIELD_RE.format(label=re.escape(label)), text, re.IGNORECASE | re.MULTILINE
        )
        if match:
            return match.group("value").strip()
    return None


def detect_region(text: str) -> str:
    normalized = normalize(text).replace("'", "")
    for region in REGIONS:
        stem = normalize(region).replace("'", "")[:6]
        if stem in normalized:
            return region
    if "tashkent" in normalized or "ташкент" in normalized:
        return "Toshkent"
    return "Noma'lum"


def detect_type(text: str) -> str | None:
    labelled = field_value(text, "Turi")
    if labelled:
        text = labelled
    if FREE_RE.search(text):
        return "Hadyaga"
    if SALE_RE.search(text):
        return "Sotiladi"
    return None


def detect_breed(text: str) -> str:
    labelled = field_value(text, "Zoti", "Zot", "Порода")
    haystack = normalize(labelled or text)
    for breed, aliases in BREED_ALIASES.items():
        if any(alias in haystack for alias in aliases):
            return breed
    if labelled:
        return labelled[:40]
    return "Boshqa/Oddiy"


def detect_gender(text: str) -> str:
    haystack = normalize(field_value(text, "Jinsi", "Пол") or text)
    for gender, aliases in GENDER_ALIASES.items():
        if any(alias in haystack for alias in aliases):
            return gender
    return "Noma'lum"


ALBUM_WINDOW = 5  # seconds between album photos in an export


def message_time(message: dict[str, Any]) -> int:
    if message.get("date_unixtime"):
        return int(message["date_unixtime"])
    return int(
        datetime.fromisoformat(message["date"]).replace(tzinfo=timezone.utc).timestamp()
    )


@dataclass
class ParsedListing:
    message_id: int
    message_ids: list[int]
    listing_type: str
    region: str
    breed: str
    age: str
    gender: str
    price: str
    contact: str
    text: str
    has_media: bool
    created_at: str
    post_link: str | None


@dataclass
class ImportReport:
    imported: list[ParsedListing] = field(default_factory=list)
    skipped_known: int = 0
    skipped_closed: int = 0
    skipped_unrecognized: int = 0


def parse_message(message: dict[str, Any], text: str) -> ParsedListing | None:
    listing_type = detect_type(text)
    if listing_type is None:
        return None
    phone = PHONE_RE.search(text)
    username = USERNAME_RE.search(text)
    contact = field_value(text, "Aloqa", "Tel", "Телефон") or (
        phone.group(0) if phone else username.group(0) if username else "Kanal postida"
    )
    if listing_type == "Hadyaga":
        price = "Hadyaga / Bepul"
    else:
        price_match = PRICE_RE.search(text)
        price = field_value(text, "Narxi", "Narx", "Цена") or (
            price_match.group(0).strip() if price_match else "Kelishiladi"
        )
    age_match = AGE_RE.search(text)
    age = field_value(text, "Yoshi", "Yosh", "Возраст") or (
        age_match.group(0) if age_match else "Noma'lum"
    )
    created = datetime.fromtimestamp(message_time(message), timezone.utc)
    return ParsedListing(
        message_id=int(message["id"]),
        message_ids=[int(message["id"])],
        listing_type=listing_type,
        region=detect_region(field_value(text, "Hudud", "Manzil", "Город") or text),
        breed=detect_breed(text),
        age=age[:30],
        gender=detect_gender(text),
        price=price[:40],
        contact=contact[:64],
        text=text.strip(),
        has_media="photo" in message,
        created_at=to_iso(created),
        post_link=None,
    )


def parse_export(
    export: dict[str, Any],
    db: Database,
    channel_username: str | None = None,
) -> ImportReport:
    report = ImportReport()
    channel_id = export.get("id")
    current: ParsedListing | None = None
    current_message: dict[str, Any] = {}
    for message in export.get("messages", []):
        if message.get("type") != "message":
            continue
        text = flatten_text(message.get("text")).strip()
        # Album photos without text follow the captioned photo in an export.
        if not text and "photo" in message and current is not None:
            if message_time(message) - message_time(current_message) <= ALBUM_WINDOW:
                current.message_ids.append(int(message["id"]))
            continue
        current = None
        if not text:
            continue
        if db.channel_message_known(int(message["id"])):
            report.skipped_known += 1
            continue
        if CLOSED_RE.search(text):
            report.skipped_closed += 1
            continue
        parsed = parse_message(message, text)
        if parsed is None:
            report.skipped_unrecognized += 1
            continue
        if channel_username:
            parsed.post_link = f"https://t.me/{channel_username.lstrip('@')}/{parsed.message_id}"
        elif channel_id:
            parsed.post_link = f"https://t.me/c/{channel_id}/{parsed.message_id}"
        report.imported.append(parsed)
        current, current_message = parsed, message
    return report


def save(report: ImportReport, db: Database) -> None:
    now = utc_now()
    for item in report.imported:
        db.create_listing(
            user_id=None,
            listing_type=item.listing_type,
            region=item.region,
            breed=item.breed,
            age=item.age,
            gender=item.gender,
            price=item.price,
            contact=item.contact,
            photo_ids=[],
            status="active",
            channel_message_ids=item.message_ids,
            post_link=item.post_link,
            source="import",
            original_text=item.text,
            post_has_media=item.has_media,
            created_at=item.created_at,
            # The 30-day lifecycle starts at import, not at the original post date.
            active_since=now,
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("export", type=Path, help="Telegram Desktop result.json")
    parser.add_argument("--db", default=os.getenv("DB_PATH", "data/cats.db"))
    parser.add_argument(
        "--channel-username",
        help="Public channel username for post links (default: private t.me/c links)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse only, write nothing")
    args = parser.parse_args(argv)

    export = json.loads(args.export.read_text(encoding="utf-8"))
    db = Database(args.db)
    try:
        report = parse_export(export, db, args.channel_username)
        for item in report.imported:
            print(
                f"#{item.message_id}: {item.listing_type}, {item.region}, "
                f"{item.breed}, {item.price}, {item.contact}"
            )
        if not args.dry_run:
            save(report, db)
    finally:
        db.close()
    print(
        f"\n{'Topildi' if args.dry_run else 'Import qilindi'}: {len(report.imported)} ta; "
        f"bazada bor: {report.skipped_known}; yakunlangan: {report.skipped_closed}; "
        f"e'lon emas: {report.skipped_unrecognized}"
    )
    return 0
