FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DB_PATH=/app/data/cats.db

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY cat_bot ./cat_bot
COPY main.py import_channel.py ./

# SQLite database lives here; mount a volume so listings survive redeploys.
VOLUME ["/app/data"]

CMD ["python", "main.py"]
