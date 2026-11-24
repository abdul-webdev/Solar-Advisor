"""Session-handling regressions: the token must survive environments that drop
custom headers or block Web Storage."""


def test_login_sets_session_cookie_and_cookie_authenticates(client):
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "User@12345"})
    assert r.status_code == 200
    assert r.get_json()["token"]
    cookie = r.headers.get("Set-Cookie", "")
    assert "sa_token=" in cookie

    # Same client now carries the cookie: no Authorization header at all.
    assert client.get("/api/auth/me").status_code == 200
    assert client.get("/api/chat/history").status_code == 200
    r = client.post("/api/chat", json={"message": "I have 3 fans and 5 lights. I need 5 hours of backup."})
    assert r.status_code == 200
    assert r.get_json()["recommendation"] is not None


def test_register_also_issues_a_usable_token(client):
    r = client.post("/api/auth/register", json={
        "name": "Cookie User", "email": "cookie@example.com", "password": "Cookie@12345"})
    assert r.status_code == 201
    token = r.get_json()["token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
    assert client.get("/api/auth/me", headers={"X-Auth-Token": token}).status_code == 200


def test_logout_clears_session(client):
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "User@12345"})
    assert client.get("/api/auth/me").status_code == 200
    client.post("/api/auth/logout")
    assert client.get("/api/auth/me").status_code == 401


def test_tampered_and_missing_tokens_are_rejected(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "User@12345"})
    token = r.get_json()["token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}x"}).status_code == 401


def test_cookie_cannot_escalate_privileges(client):
    """A general-user cookie must still be refused by admin endpoints."""
    client.post("/api/auth/login", json={"email": "user@example.com", "password": "User@12345"})
    assert client.get("/api/admin/stats").status_code == 403
