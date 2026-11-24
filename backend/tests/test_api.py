from tests.conftest import auth


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_register_and_login(client):
    r = client.post("/api/auth/register", json={"name": "Test User", "email": "testuser@example.com", "password": "Test@12345"})
    assert r.status_code == 201
    assert r.get_json()["user"]["role"] == "user"
    r = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "Test@12345"})
    assert r.status_code == 200
    r = client.post("/api/auth/login", json={"email": "testuser@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_auth_required(client):
    assert client.get("/api/recommendations").status_code == 401
    assert client.get("/api/knowledge").status_code == 401


def test_role_based_access(client, user_token, admin_token):
    # General user cannot reach admin APIs
    assert client.get("/api/admin/stats", headers=auth(user_token)).status_code == 403
    assert client.post("/api/admin/knowledge", headers=auth(user_token),
                       json={"title": "X", "description": "Y"}).status_code == 403
    # Admin can
    assert client.get("/api/admin/stats", headers=auth(admin_token)).status_code == 200
    assert client.get("/api/admin/users", headers=auth(admin_token)).status_code == 200


def test_chat_full_workflow(client, user_token):
    h = auth(user_token)
    # 1. No appliances -> clarification, no recommendation
    r = client.post("/api/chat", headers=h, json={"message": "Hello there", "history": []})
    assert r.status_code == 200
    # 2. Appliances without backup -> asks for backup hours
    r = client.post("/api/chat", headers=h, json={
        "message": "I have 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine.",
        "history": []})
    data = r.get_json()
    assert data["recommendation"] is None
    assert data["questions"]
    # 3. Answer with backup hours -> recommendation generated + saved
    history = [{"role": "user", "content": "I have 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine."}]
    r = client.post("/api/chat", headers=h, json={"message": "I need 8 hours of backup.", "history": history})
    data = r.get_json()
    rec = data["recommendation"]
    assert rec is not None
    assert rec["total_load_w"] == 2112
    assert rec["inverter_capacity_kw"] == 3.0
    assert "INV-002" in rec["triggered_rules"]
    assert rec["id"]
    # 4. Retrieve saved recommendation
    r = client.get("/api/recommendations", headers=h)
    assert len(r.get_json()["recommendations"]) >= 1
    r = client.get(f"/api/recommendations/{rec['id']}", headers=h)
    assert r.status_code == 200
    assert len(r.get_json()["recommendation"]["appliances"]) == 5


def test_knowledge_and_rules_read(client, user_token):
    h = auth(user_token)
    r = client.get("/api/knowledge", headers=h)
    assert r.status_code == 200 and len(r.get_json()["facts"]) >= 5
    r = client.get("/api/rules", headers=h)
    assert len(r.get_json()["rules"]) >= 5
    r = client.get("/api/equipment", headers=h)
    eq = r.get_json()
    assert len(eq["panels"]) >= 1 and len(eq["inverters"]) >= 1 and len(eq["batteries"]) >= 1


def test_admin_crud_and_rule_testing(client, admin_token):
    h = auth(admin_token)
    # Knowledge CRUD
    r = client.post("/api/admin/knowledge", headers=h,
                    json={"title": "Test Fact", "category": "Testing", "description": "A test fact."})
    assert r.status_code == 201
    fid = r.get_json()["fact"]["id"]
    r = client.patch(f"/api/admin/knowledge/{fid}", headers=h, json={"description": "Updated."})
    assert r.get_json()["fact"]["description"] == "Updated."
    assert client.delete(f"/api/admin/knowledge/{fid}", headers=h).status_code == 200
    # Rule CRUD
    r = client.post("/api/admin/rules", headers=h, json={
        "rule_code": "TST-999", "name": "Test rule", "condition_field": "total_load_w",
        "operator": "gt", "threshold_value": 5000, "description": "Test only."})
    assert r.status_code == 201
    rid = r.get_json()["rule"]["id"]
    assert client.delete(f"/api/admin/rules/{rid}", headers=h).status_code == 200
    # Equipment CRUD
    r = client.post("/api/admin/equipment/panels", headers=h,
                    json={"manufacturer": "TestCo", "model": "T-100", "wattage_w": 100})
    assert r.status_code == 201
    pid = r.get_json()["record"]["id"]
    assert client.delete(f"/api/admin/equipment/panels/{pid}", headers=h).status_code == 200
    # Rule testing sandbox
    r = client.post("/api/admin/test-rules", headers=h, json={
        "text": "I have a two-bedroom house with 4 fans, 8 LED lights, one refrigerator, one LED TV and a washing machine. I need backup for around 8 hours."})
    assert r.status_code == 200
    data = r.get_json()
    assert data["recommendation"]["total_load_w"] == 2112
    assert len(data["recommendation"]["trace"]) > 0
    # Traces recorded
    r = client.get("/api/admin/traces", headers=h)
    assert len(r.get_json()["traces"]) >= 1
