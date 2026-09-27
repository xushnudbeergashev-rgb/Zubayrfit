from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3
from typing import Any


REGIONS = [
    "Toshkent",
    "Andijon",
    "Farg‘ona",
    "Namangan",
    "Samarqand",
    "Buxoro",
    "Qashqadaryo",
    "Surxondaryo",
    "Jizzax",
    "Sirdaryo",
    "Navoiy",
    "Xorazm",
    "Qoraqalpog‘iston",
]

STATUSES = ("pending", "active", "hidden", "sold", "rejected", "expired")

LISTINGS_SCHEMA = """
CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(telegram_id),
    listing_type TEXT NOT NULL CHECK (listing_type IN ('Hadyaga', 'Sotiladi')),
    region TEXT NOT NULL,
    breed TEXT NOT NULL,
    age TEXT NOT NULL,
    gender TEXT NOT NULL,
    price TEXT NOT NULL,
    contact TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    photo_ids TEXT NOT NULL,
    channel_message_id INTEGER,
    channel_message_ids TEXT,
    post_link TEXT,
    post_has_media INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'hidden', 'sold', 'rejected', 'expired')),
    payment_receipt_file_id TEXT,
    payment_receipt_unique_id TEXT,
    photo_check TEXT,
    source TEXT NOT NULL DEFAULT 'bot' CHECK (source IN ('bot', 'import')),
    original_text TEXT,
    created_at TEXT NOT NULL,
    active_since TEXT,
    renewal_asked_at TEXT,
    closed_at TEXT
)
"""

LISTING_COLUMNS = (
    "id, user_id, listing_type, region, breed, age, gender, price, contact, "
    "description, photo_ids, channel_message_id, channel_message_ids, post_link, "
    "post_has_media, status, payment_receipt_file_id, payment_receipt_unique_id, "
    "photo_check, source, original_text, created_at, active_since, "
    "renewal_asked_at, closed_at"
)


class ReceiptAlreadyUsed(Exception):
    """Raised when a payment receipt photo was already attached to a listing."""


def utc_now() -> str:
    return to_iso(datetime.now(timezone.utc))


def to_iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat(timespec="seconds")


class Database:
    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = sqlite3.connect(self.path, check_same_thread=False)
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA foreign_keys = ON")
        self.initialize()

    def initialize(self) -> None:
        self.connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                telegram_id INTEGER PRIMARY KEY,
                username TEXT,
                full_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS regions (
                name TEXT PRIMARY KEY,
                created_at TEXT NOT NULL
            );
            """
        )
        self._migrate_listings()
        self.connection.executescript(
            LISTINGS_SCHEMA
            + """;
            CREATE INDEX IF NOT EXISTS idx_listings_filters
                ON listings(status, region, listing_type, created_at);
            CREATE INDEX IF NOT EXISTS idx_listings_user
                ON listings(user_id, created_at);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_receipt
                ON listings(payment_receipt_unique_id)
                WHERE payment_receipt_unique_id IS NOT NULL;
            """
        )
        now = utc_now()
        self.connection.executemany(
            "INSERT OR IGNORE INTO regions(name, created_at) VALUES (?, ?)",
            [(region, now) for region in REGIONS],
        )
        self.connection.commit()

    def _migrate_listings(self) -> None:
        """Rebuild listings created by older versions whose CHECK lacks new statuses."""
        row = self.connection.execute(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'listings'"
        ).fetchone()
        if row is None or "'pending'" in row["sql"]:
            return
        old_columns = {
            info["name"]
            for info in self.connection.execute("PRAGMA table_info(listings)")
        }
        copied = [
            column
            for column in (
                "id", "user_id", "listing_type", "region", "breed", "age", "gender",
                "price", "contact", "photo_ids", "channel_message_id",
                "channel_message_ids", "post_link", "status", "created_at",
            )
            if column in old_columns
        ]
        column_list = ", ".join(copied)
        self.connection.execute("PRAGMA foreign_keys = OFF")
        try:
            with self.connection:
                self.connection.execute("DROP INDEX IF EXISTS idx_listings_filters")
                self.connection.execute("ALTER TABLE listings RENAME TO listings_old")
                self.connection.execute(LISTINGS_SCHEMA)
                self.connection.execute(
                    f"""
                    INSERT INTO listings({column_list}, active_since)
                    SELECT {column_list},
                           CASE WHEN status = 'active' THEN created_at END
                    FROM listings_old
                    """
                )
                self.connection.execute("DROP TABLE listings_old")
        finally:
            self.connection.execute("PRAGMA foreign_keys = ON")

    def upsert_user(self, telegram_id: int, username: str | None, full_name: str) -> None:
        now = utc_now()
        self.connection.execute(
            """
            INSERT INTO users(telegram_id, username, full_name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(telegram_id) DO UPDATE SET
                username = excluded.username,
                full_name = excluded.full_name,
                updated_at = excluded.updated_at
            """,
            (telegram_id, username, full_name, now, now),
        )
        self.connection.commit()

    def create_listing(
        self,
        *,
        user_id: int | None,
        listing_type: str,
        region: str,
        breed: str,
        age: str,
        gender: str,
        price: str,
        contact: str,
        photo_ids: list[str],
        description: str = "",
        status: str = "active",
        channel_message_id: int | None = None,
        post_link: str | None = None,
        channel_message_ids: list[int] | None = None,
        payment_receipt_file_id: str | None = None,
        payment_receipt_unique_id: str | None = None,
        photo_check: str | None = None,
        source: str = "bot",
        original_text: str | None = None,
        post_has_media: bool = True,
        created_at: str | None = None,
        active_since: str | None = None,
    ) -> int:
        if status not in STATUSES:
            raise ValueError(f"Unsupported listing status: {status}")
        message_ids = channel_message_ids or (
            [channel_message_id] if channel_message_id is not None else []
        )
        now = utc_now()
        try:
            cursor = self.connection.execute(
                """
                INSERT INTO listings(
                    user_id, listing_type, region, breed, age, gender, price,
                    contact, description, photo_ids, channel_message_id,
                    channel_message_ids, post_link, post_has_media, status,
                    payment_receipt_file_id, payment_receipt_unique_id,
                    photo_check, source, original_text, created_at, active_since
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    listing_type,
                    region,
                    breed,
                    age,
                    gender,
                    price,
                    contact,
                    description,
                    json.dumps(photo_ids),
                    message_ids[0] if message_ids else None,
                    json.dumps(message_ids),
                    post_link,
                    int(post_has_media),
                    status,
                    payment_receipt_file_id,
                    payment_receipt_unique_id,
                    photo_check,
                    source,
                    original_text,
                    created_at or now,
                    (active_since or created_at or now) if status == "active" else None,
                ),
            )
        except sqlite3.IntegrityError as error:
            self.connection.rollback()
            if "payment_receipt_unique_id" in str(error):
                raise ReceiptAlreadyUsed from error
            raise
        self.connection.commit()
        return int(cursor.lastrowid)

    def receipt_used(self, unique_id: str) -> bool:
        row = self.connection.execute(
            "SELECT 1 FROM listings WHERE payment_receipt_unique_id = ?",
            (unique_id,),
        ).fetchone()
        return row is not None

    def channel_message_known(self, message_id: int) -> bool:
        row = self.connection.execute(
            """
            SELECT 1 FROM listings
            WHERE channel_message_id = ?
               OR EXISTS (
                   SELECT 1 FROM json_each(listings.channel_message_ids)
                   WHERE json_each.value = ?
               )
            """,
            (message_id, message_id),
        ).fetchone()
        return row is not None

    def count_user_listings(
        self, user_id: int, *, status: str | None = None, since: str | None = None
    ) -> int:
        conditions = ["user_id = ?"]
        values: list[Any] = [user_id]
        if status is not None:
            conditions.append("status = ?")
            values.append(status)
        if since is not None:
            conditions.append("created_at >= ?")
            values.append(since)
        return int(
            self.connection.execute(
                f"SELECT COUNT(*) FROM listings WHERE {' AND '.join(conditions)}",
                values,
            ).fetchone()[0]
        )

    def last_user_listing_at(self, user_id: int) -> str | None:
        row = self.connection.execute(
            "SELECT MAX(created_at) FROM listings WHERE user_id = ?", (user_id,)
        ).fetchone()
        return row[0]

    def search_listings(
        self, region: str | None = None, listing_type: str | None = None
    ) -> list[dict[str, Any]]:
        conditions = ["status = 'active'"]
        values: list[str] = []
        if region:
            conditions.append("region = ?")
            values.append(region)
        if listing_type:
            conditions.append("listing_type = ?")
            values.append(listing_type)
        return self._fetch(
            " AND ".join(conditions), values, order="created_at DESC", limit=20
        )

    def recent_listings(self, limit: int = 10) -> list[dict[str, Any]]:
        return self._fetch(
            "1 = 1", (), order="created_at DESC", limit=max(1, min(limit, 50))
        )

    def user_active_listings(self, user_id: int) -> list[dict[str, Any]]:
        return self._fetch(
            "user_id = ? AND status = 'active'", (user_id,), order="created_at DESC"
        )

    def listings_due_for_renewal(self, cutoff: str) -> list[dict[str, Any]]:
        return self._fetch(
            "status = 'active' AND renewal_asked_at IS NULL "
            "AND active_since IS NOT NULL AND active_since <= ?",
            (cutoff,),
        )

    def listings_renewal_overdue(self, cutoff: str) -> list[dict[str, Any]]:
        return self._fetch(
            "status = 'active' AND renewal_asked_at IS NOT NULL AND renewal_asked_at <= ?",
            (cutoff,),
        )

    def get_listing(self, listing_id: int) -> dict[str, Any] | None:
        items = self._fetch("id = ?", (listing_id,))
        return items[0] if items else None

    def _fetch(
        self,
        where: str,
        values: Any,
        *,
        order: str = "id",
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        sql = f"SELECT {LISTING_COLUMNS} FROM listings WHERE {where} ORDER BY {order}"
        if limit is not None:
            sql += f" LIMIT {int(limit)}"
        results = []
        for row in self.connection.execute(sql, values).fetchall():
            item = dict(row)
            item["photo_ids"] = json.loads(item["photo_ids"])
            item["channel_message_ids"] = self._message_ids(item)
            item["post_has_media"] = bool(item["post_has_media"])
            results.append(item)
        return results

    def set_listing_status(
        self,
        listing_id: int,
        status: str,
        *,
        channel_message_id: int | None = None,
        channel_message_ids: list[int] | None = None,
        post_link: str | None = None,
    ) -> bool:
        if status not in STATUSES:
            raise ValueError(f"Unsupported listing status: {status}")
        now = utc_now()
        fields = ["status = ?"]
        values: list[Any] = [status]
        if status == "active":
            fields += ["active_since = ?", "renewal_asked_at = NULL", "closed_at = NULL"]
            values.append(now)
        elif status in {"sold", "expired", "rejected"}:
            fields.append("closed_at = ?")
            values.append(now)
        if channel_message_id is not None:
            fields.append("channel_message_id = ?")
            values.append(channel_message_id)
        if channel_message_ids is not None:
            fields.append("channel_message_ids = ?")
            values.append(json.dumps(channel_message_ids))
        if post_link is not None:
            fields.append("post_link = ?")
            values.append(post_link)
        values.append(listing_id)
        cursor = self.connection.execute(
            f"UPDATE listings SET {', '.join(fields)} WHERE id = ?",
            values,
        )
        self.connection.commit()
        return cursor.rowcount == 1

    def mark_renewal_asked(self, listing_id: int, when: str | None = None) -> None:
        self.connection.execute(
            "UPDATE listings SET renewal_asked_at = ? WHERE id = ?",
            (when or utc_now(), listing_id),
        )
        self.connection.commit()

    def renew_listing(self, listing_id: int) -> None:
        self.connection.execute(
            "UPDATE listings SET active_since = ?, renewal_asked_at = NULL WHERE id = ?",
            (utc_now(), listing_id),
        )
        self.connection.commit()

    def _message_ids(self, item: dict[str, Any]) -> list[int]:
        raw_ids = item.get("channel_message_ids")
        if raw_ids:
            try:
                return [int(message_id) for message_id in json.loads(raw_ids)]
            except (TypeError, ValueError, json.JSONDecodeError):
                pass
        message_id = item.get("channel_message_id")
        return [int(message_id)] if message_id is not None else []

    def stats(self) -> dict[str, int]:
        def count(where: str) -> int:
            return int(
                self.connection.execute(
                    f"SELECT COUNT(*) FROM listings WHERE {where}"
                ).fetchone()[0]
            )

        user_count = self.connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        return {
            "users": int(user_count),
            "active_listings": count("status = 'active'"),
            "pending_listings": count("status = 'pending'"),
            "hadyaga": count("status = 'active' AND listing_type = 'Hadyaga'"),
            "sotiladi": count("status = 'active' AND listing_type = 'Sotiladi'"),
        }

    def close(self) -> None:
        self.connection.close()


def days_ago(days: int, now: datetime | None = None) -> str:
    return to_iso((now or datetime.now(timezone.utc)) - timedelta(days=days))
