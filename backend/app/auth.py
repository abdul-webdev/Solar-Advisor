"""Token auth (HMAC-signed, stdlib only) + role guards."""
import base64
import hashlib
import hmac
import json
import os
import time

from flask import g, jsonify, request
from werkzeug.security import check_password_hash

SECRET = os.environ.get("SOLAR_SECRET", "solar-advisor-dev-secret-change-me")
TOKEN_TTL = 60 * 60 * 24 * 7  # 7 days


def make_token(user):
    payload = {"uid": user["id"], "role": user["role"], "exp": int(time.time()) + TOKEN_TTL}
    raw = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    sig = hmac.new(SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
    return f"{raw}.{sig}"


def verify_token(token):
    try:
        raw, sig = token.split(".", 1)
        expected = hmac.new(SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        padded = raw + "=" * (-len(raw) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


TOKEN_COOKIE = "sa_token"


def request_token():
    """Read the session token from the Authorization header, the X-Auth-Token
    fallback header, or the session cookie (used when a proxy strips headers)."""
    auth = request.headers.get("Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token:
        token = (request.headers.get("X-Auth-Token") or "").strip()
    if not token:
        token = (request.cookies.get(TOKEN_COOKIE) or "").strip()
    if not token:
        token = (request.args.get("access_token") or "").strip()
    return token


def current_user():
    token = request_token()
    if not token:
        return None
    payload = verify_token(token)
    if not payload:
        return None
    from app.database import get_db

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (payload["uid"],)).fetchone()
    conn.close()
    if not row or row["status"] == "suspended":
        return None
    return dict(row)


def require_auth(fn):
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def require_admin(fn):
    from functools import wraps

    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            return jsonify({"error": "Authentication required. Please log in."}), 401
        if user["role"] != "admin":
            return jsonify({"error": "Administrator access required."}), 403
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def check_credentials(email, password):
    from app.database import get_db

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    conn.close()
    if not row:
        return None
    if not check_password_hash(row["password_hash"], password):
        return None
    if row["status"] == "suspended":
        return None
    return dict(row)
