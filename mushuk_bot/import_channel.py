"""Import old channel posts from a Telegram Desktop JSON export.

Usage: python import_channel.py path/to/result.json [--channel-username mushuklar_bozori] [--dry-run]
"""

import sys

from cat_bot.importer import main


if __name__ == "__main__":
    sys.exit(main())
