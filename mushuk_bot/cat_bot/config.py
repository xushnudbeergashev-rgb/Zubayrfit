from dataclasses import dataclass
import os

from dotenv import load_dotenv


DEFAULT_ADMIN_USER_IDS = "8278830955"


@dataclass(frozen=True)
class Settings:
    bot_token: str
    channel_id: int | str
    db_path: str
    openai_api_key: str | None
    admin_user_ids: frozenset[int]
    admin_contact: str = "@zby_r"
    channel_handle: str = "@mushuklar_bozori"
    payment_card: str = "9860160602663017"
    payment_card_owner: str = "Hushnudbek Ergashev"
    listing_fee: int = 7000
    listing_lifetime_days: int = 30
    renewal_grace_days: int = 3

    @classmethod
    def from_env(cls) -> "Settings":
        load_dotenv()

        bot_token = os.getenv("BOT_TOKEN", "").strip()
        if not bot_token:
            raise RuntimeError("BOT_TOKEN is required. Add it to Replit Secrets.")

        raw_channel_id = os.getenv("CHANNEL_ID", "").strip()
        if not raw_channel_id:
            raise RuntimeError(
                "CHANNEL_ID is required. Set it to a numeric channel ID or @username."
            )
        channel_id: int | str
        try:
            channel_id = int(raw_channel_id)
        except ValueError:
            channel_id = raw_channel_id

        raw_admin_ids = os.getenv("ADMIN_USER_IDS", "").strip() or DEFAULT_ADMIN_USER_IDS
        admin_ids = frozenset(
            int(value.strip())
            for value in raw_admin_ids.split(",")
            if value.strip().lstrip("-").isdigit()
        )

        optional = {
            field: os.getenv(env_name, "").strip()
            for field, env_name in (
                ("admin_contact", "ADMIN_CONTACT"),
                ("channel_handle", "CHANNEL_HANDLE"),
                ("payment_card", "PAYMENT_CARD"),
                ("payment_card_owner", "PAYMENT_CARD_OWNER"),
            )
        }
        raw_fee = os.getenv("LISTING_FEE", "").strip()
        if raw_fee.isdigit():
            optional["listing_fee"] = int(raw_fee)

        return cls(
            bot_token=bot_token,
            channel_id=channel_id,
            db_path=os.getenv("DB_PATH", "data/cats.db"),
            openai_api_key=os.getenv("OPENAI_API_KEY") or None,
            admin_user_ids=admin_ids,
            **{key: value for key, value in optional.items() if value},
        )
