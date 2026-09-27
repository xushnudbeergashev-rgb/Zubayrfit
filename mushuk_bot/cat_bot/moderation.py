"""Anti-troll checks: cat photo verification and text moderation."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
from dataclasses import dataclass
from typing import Any
from urllib import request


logger = logging.getLogger(__name__)

OPENAI_URL = "https://api.openai.com/v1"

# Word stems matched at the start of a word (Uzbek latin/cyrillic and Russian).
PROFANITY_STEMS = (
    "jalab", "qanjiq", "haromi", "dalbayo", "gandon", "suka", "blya", "xuy",
    "pizd", "yeban", "jalap", "онагни", "жалаб", "қанжиқ", "далбаё", "гандон",
    "сука", "бля", "хуй", "хуе", "пизд", "ебан", "ебат", "еба", "мудак",
)
PROFANITY_RE = re.compile(
    r"(?<![\w])(?:" + "|".join(re.escape(stem) for stem in PROFANITY_STEMS) + ")",
    re.IGNORECASE,
)
AD_RE = re.compile(
    r"(https?://|www\.|t\.me/|telegram\.me/|@[A-Za-z0-9_]{4,}"
    r"|\b[\w-]+\.(?:uz|com|ru|net|org|me)\b)",
    re.IGNORECASE,
)

CAT_CHECK_PROMPT = (
    "You moderate a cat marketplace. Look at the image and decide whether its main "
    "subject is a real cat or kitten (domestic cat). Dogs, other animals, vehicles, "
    "clothes, garbage, people without a cat, drawings, memes or screenshots are not "
    'acceptable. Reply only with JSON: {"cat": true} or {"cat": false}.'
)


@dataclass(frozen=True)
class TextVerdict:
    allowed: bool
    reason: str = ""


def local_text_check(text: str) -> TextVerdict:
    if PROFANITY_RE.search(text):
        return TextVerdict(False, "profanity")
    if AD_RE.search(text):
        return TextVerdict(False, "advertising")
    return TextVerdict(True)


class Moderator:
    """Wraps OpenAI calls. Every check fails open when OpenAI is unavailable,
    because each listing is still reviewed by an admin before publishing."""

    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def check_text(self, text: str) -> TextVerdict:
        verdict = local_text_check(text)
        if not verdict.allowed or not self.api_key or not text.strip():
            return verdict
        body = await self._post(
            "/moderations",
            {"model": "omni-moderation-latest", "input": text},
        )
        if body is None:
            return verdict
        try:
            if body["results"][0]["flagged"]:
                return TextVerdict(False, "openai_moderation")
        except (KeyError, IndexError, TypeError):
            logger.warning("Unexpected moderation response: %s", body)
        return verdict

    async def is_cat_photo(self, image: bytes) -> bool | None:
        """True/False from GPT-4o Vision, or None when the check could not run."""
        if not self.api_key:
            return None
        data_url = "data:image/jpeg;base64," + base64.b64encode(image).decode()
        body = await self._post(
            "/chat/completions",
            {
                "model": "gpt-4o",
                "response_format": {"type": "json_object"},
                "max_tokens": 20,
                "temperature": 0,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": CAT_CHECK_PROMPT},
                            {
                                "type": "image_url",
                                "image_url": {"url": data_url, "detail": "low"},
                            },
                        ],
                    }
                ],
            },
            timeout=30,
        )
        if body is None:
            return None
        try:
            content = body["choices"][0]["message"]["content"]
            return bool(json.loads(content)["cat"])
        except (KeyError, IndexError, TypeError, ValueError):
            logger.warning("Unexpected vision response: %s", body)
            return None

    async def _post(
        self, path: str, payload: dict[str, Any], timeout: int = 15
    ) -> dict[str, Any] | None:
        data = json.dumps(payload).encode()

        def call_api() -> dict[str, Any] | None:
            req = request.Request(
                OPENAI_URL + path,
                data=data,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            try:
                with request.urlopen(req, timeout=timeout) as response:
                    return json.loads(response.read().decode())
            except Exception:
                logger.exception("OpenAI request to %s failed", path)
                return None

        return await asyncio.to_thread(call_api)
