"""WSGI entry point: gunicorn wsgi:app"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import get_db, seed

app = create_app()

# Seed the demo data on first boot in a fresh environment (e.g. a new deploy).
try:
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    if count == 0:
        seed()
except Exception as exc:  # pragma: no cover
    print(f"Seed skipped: {exc}")
