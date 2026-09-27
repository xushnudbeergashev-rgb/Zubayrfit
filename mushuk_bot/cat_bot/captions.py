"""Text rendering for previews, channel posts and admin messages."""

from __future__ import annotations

import html
import re
from typing import Any

from .config import Settings


TYPE_FREE = "Hadyaga"
TYPE_SALE = "Sotiladi"

PHONE_RE = re.compile(r"\+?\d[\d\s()-]{7,}\d")
USERNAME_RE = re.compile(r"@[A-Za-z0-9_]{4,}")
CONTACT_LINE_RE = re.compile(
    r"^.*(☎|📞|📱|aloqa|tel[:.\s]|telefon|murojaat).*$", re.IGNORECASE | re.MULTILINE
)


def escape(value: Any) -> str:
    return html.escape(str(value))


def slug(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-zА-Яа-яЎўҚқҒғҲҳʼ'-]+", "", value)
    return cleaned.replace("ʼ", "").replace("'", "")


def format_sum(amount: int) -> str:
    return f"{amount:,}".replace(",", " ")


def format_card(card: str) -> str:
    digits = re.sub(r"\D", "", card)
    return " ".join(digits[i : i + 4] for i in range(0, len(digits), 4)) or card


def closed_label(listing_type: str) -> str:
    return "SOTILDI" if listing_type == TYPE_SALE else "BERILDI"


def channel_footer(settings: Settings, bot_username: str | None) -> str:
    bot_mention = f"@{bot_username}" if bot_username else "botimiz"
    return (
        f"📢 Kanalimiz: {escape(settings.channel_handle)}\n"
        "🤖 E'lon berish yoki mushuklarni ko‘rish uchun botimizga yozing: "
        f"{escape(bot_mention)}"
    )


def listing_fields(data: dict[str, Any], *, with_contact: bool = True) -> str:
    lines = [
        f"📍 <b>Hudud:</b> {escape(data['region'])}",
        f"🧬 <b>Zoti:</b> {escape(data['breed'])}",
        f"🎂 <b>Yoshi:</b> {escape(data['age'])}",
        f"⚧ <b>Jinsi:</b> {escape(data['gender'])}",
        f"💰 <b>Narxi:</b> {escape(data['price'])}",
    ]
    if data.get("description"):
        lines.append(f"📝 <b>Izoh:</b> {escape(data['description'])}")
    if with_contact:
        lines.append(f"☎️ <b>Aloqa:</b> {escape(data['contact'])}")
    return "\n".join(lines)


def preview_caption(data: dict[str, Any]) -> str:
    return (
        "📋 <b>E'lon ko‘rinishi</b>\n\n"
        f"🐱 <b>Turi:</b> {escape(data['listing_type'])}\n"
        f"{listing_fields(data)}\n\n"
        "Ma'lumotlar to‘g‘rimi?"
    )


def channel_caption(
    data: dict[str, Any],
    settings: Settings,
    bot_username: str | None,
    status: str = "active",
) -> str:
    """Caption for the channel post. Closed listings lose their contacts."""
    closed = status in {"sold", "expired"}
    if data.get("source") == "import" and data.get("original_text") is not None:
        body = strip_contacts(data["original_text"]) if closed else data["original_text"]
        body = escape(body)
    else:
        region_tag = f"#{slug(data['region'])}"
        type_tag = "#Hadyaga" if data["listing_type"] == TYPE_FREE else "#Sotiladi"
        body = (
            f"🐱 <b>Mushuk {escape(data['listing_type'].lower())}</b>\n\n"
            f"{listing_fields(data, with_contact=not closed)}\n\n"
            f"{region_tag} {type_tag}\n\n"
            f"{channel_footer(settings, bot_username)}"
        )
    if closed:
        body = f"✅ <b>{closed_label(data['listing_type'])}</b>\n\n{body}"
    return body


def strip_contacts(text: str) -> str:
    text = CONTACT_LINE_RE.sub("", text)
    text = PHONE_RE.sub("", text)
    text = USERNAME_RE.sub("", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def closed_notice(item: dict[str, Any]) -> str:
    verb = "sotildi" if item["listing_type"] == TYPE_SALE else "yangi egasiga berildi"
    text = (
        f"✅ <b>{closed_label(item['listing_type'])}</b>\n"
        f"{escape(item['region'])} hududidagi {escape(item['breed'])} mushuk {verb}."
    )
    if item.get("post_link"):
        text += f'\n🔗 <a href="{escape(item["post_link"])}">E\'lon</a>'
    return text


STATUS_LABELS = {
    "pending": "⏳ Tasdiq kutilmoqda",
    "active": "🟢 Faol",
    "hidden": "🙈 Yashirilgan",
    "sold": "✅ Sotilgan / berilgan",
    "rejected": "🔴 Rad etilgan",
    "expired": "⌛ Muddati tugagan",
}


def admin_listing_caption(item: dict[str, Any]) -> str:
    return (
        f"🆔 <b>E'lon #{item['id']}</b>\n"
        f"Holati: <b>{STATUS_LABELS.get(item['status'], item['status'])}</b>\n\n"
        f"🐱 <b>Turi:</b> {escape(item['listing_type'])}\n"
        f"{listing_fields(item)}"
    )


def admin_review_caption(item: dict[str, Any], settings: Settings) -> str:
    checks = {
        "passed": "✅ AI: rasmlarda mushuk bor",
        "skipped": "⚠️ AI rasm tekshiruvi bajarilmadi — rasmlarni o‘zingiz tekshiring",
    }
    lines = [
        "🆕 <b>Yangi e'lon tasdiqlash uchun</b>",
        admin_listing_caption(item),
        "",
        checks.get(item.get("photo_check") or "", checks["skipped"]),
    ]
    if item["listing_type"] == TYPE_SALE:
        lines.append(
            f"💳 To‘lov: {format_sum(settings.listing_fee)} so‘m — chek yuqorida."
        )
    else:
        lines.append("🎁 Bepul e'lon (0 so‘m).")
    return "\n".join(lines)
