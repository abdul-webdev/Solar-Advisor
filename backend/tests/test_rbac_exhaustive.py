"""Exhaustive RBAC audit: no admin route may answer a general user.

Rather than spot-checking a few endpoints, this walks Flask's URL map and hits
every registered /api/admin/* route with a General User token. Any route that
does not answer 401/403 fails the build.
"""


def _admin_routes(app):
    """Yield (rule, method) for every method of every /api/admin/* route."""
    for rule in app.url_map.iter_rules():
        if not str(rule).startswith("/api/admin/"):
            continue
        for method in sorted(rule.methods - {"HEAD", "OPTIONS"}):
            yield str(rule), method


def _url_for(rule_str):
    """Replace <converter:name> placeholders with a concrete id."""
    out = rule_str
    for token in ("<int:fact_id>", "<int:rule_id>", "<int:rec_id>", "<int:app_id>",
                  "<int:user_id>", "<kind>"):
        out = out.replace(token, "1" if token.startswith("<int") else "panels")
    return out


def test_every_admin_route_rejects_a_general_user(app, client):
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "User@12345"})
    token = r.get_json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    routes = list(_admin_routes(app))
    assert len(routes) >= 20, f"expected at least 20 admin routes, found {len(routes)}"

    failures = []
    for rule, method in routes:
        res = client.open(_url_for(rule), method=method, headers=headers, json={})
        if res.status_code not in (401, 403):
            failures.append(f"{method} {rule} -> {res.status_code}")

    assert not failures, "general user was NOT blocked on: " + "; ".join(failures)


def test_every_admin_route_rejects_an_anonymous_caller(app, client):
    failures = []
    for rule, method in _admin_routes(app):
        res = client.open(_url_for(rule), method=method, json={})
        if res.status_code not in (401, 403):
            failures.append(f"{method} {rule} -> {res.status_code}")
    assert not failures, "anonymous caller was NOT blocked on: " + "; ".join(failures)


def test_admin_can_reach_admin_routes(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    assert client.get("/api/admin/stats", headers=headers).status_code == 200
    assert client.get("/api/admin/users", headers=headers).status_code == 200
    assert client.get("/api/admin/knowledge", headers=headers).status_code == 200


def test_general_user_knowledge_access_is_read_only_and_published_only(client, admin_token, user_token):
    """Users may READ published facts. They must not see drafts or write anything."""
    ah = {"Authorization": f"Bearer {admin_token}"}
    uh = {"Authorization": f"Bearer {user_token}"}

    # Create a draft as admin
    r = client.post("/api/admin/knowledge", headers=ah, json={
        "title": "Secret draft fact", "category": "Testing",
        "description": "Should never be visible to general users.", "status": "draft"})
    assert r.status_code == 201
    fid = r.get_json()["fact"]["id"]

    # General user's published listing must not contain it
    facts = client.get("/api/knowledge", headers=uh).get_json()["facts"]
    assert all(f["id"] != fid for f in facts), "draft fact leaked to a general user"
    assert all(f["status"] == "published" for f in facts), "non-published fact exposed"

    # Admin listing does contain it
    admin_facts = client.get("/api/admin/knowledge", headers=ah).get_json()["facts"]
    assert any(f["id"] == fid for f in admin_facts)

    # And the user still cannot mutate it
    assert client.patch(f"/api/admin/knowledge/{fid}", headers=uh,
                        json={"description": "hacked"}).status_code == 403
    assert client.delete(f"/api/admin/knowledge/{fid}", headers=uh).status_code == 403

    client.delete(f"/api/admin/knowledge/{fid}", headers=ah)


def test_settings_are_admin_only(client, user_token, admin_token):
    """Engineering defaults are administrator configuration, not user data."""
    assert client.get("/api/settings", headers={"Authorization": f"Bearer {user_token}"}).status_code == 403
    assert client.get("/api/settings", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200


def test_user_cannot_read_another_users_recommendation(client, admin_token, user_token):
    """Cross-tenant read: admin's own report must not be readable by a user."""
    # Create a recommendation owned by the admin through the chat endpoint
    r = client.post("/api/chat", headers={"Authorization": f"Bearer {admin_token}"},
                    json={"message": "I have 2 fans and need 4 hours of backup.", "history": []})
    admin_rec_id = r.get_json()["recommendation"]["id"]

    r = client.get(f"/api/recommendations/{admin_rec_id}",
                   headers={"Authorization": f"Bearer {user_token}"})
    assert r.status_code == 404
    assert client.delete(f"/api/recommendations/{admin_rec_id}",
                         headers={"Authorization": f"Bearer {user_token}"}).status_code == 404


def test_cannot_self_escalate_or_self_destruct(client, admin_token):
    ah = {"Authorization": f"Bearer {admin_token}"}
    me = client.get("/api/auth/me", headers=ah).get_json()["user"]
    r = client.patch(f"/api/admin/users/{me['id']}", headers=ah, json={"role": "user"})
    assert r.status_code == 400
    assert client.delete(f"/api/admin/users/{me['id']}", headers=ah).status_code == 400
