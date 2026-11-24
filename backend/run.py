"""Entry point: python run.py  (initialises DB + seeds demo data on first run)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.database import get_db, seed

app = create_app()

# Seed demo data if the database is empty (safe to re-run).
try:
    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    if count == 0:
        seed()
except Exception as exc:  # pragma: no cover
    print(f"Seed skipped: {exc}")

if __name__ == "__main__":
    # Optional: set SOLAR_SECRET to your own value in production (used to sign session tokens).
    # Optional: set PORT to change the listening port (default 5000).
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
