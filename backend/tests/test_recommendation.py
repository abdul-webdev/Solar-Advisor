from tests.conftest import auth


def test_recommendation_generation_and_persistence(client, user_token):
    h = auth(user_token)
    r = client.post("/api/chat", headers=h, json={
        "message": "I have 3 fans, 5 lights, one refrigerator, and a television. I need backup for 6 hours.",
        "history": []})
    rec = r.get_json()["recommendation"]
    assert rec is not None
    # 3*75 + 5*9 + 200 + 100 = 570 W
    assert rec["total_load_w"] == 570
    assert rec["backup_hours_target"] == 6.0
    assert rec["daily_energy_kwh"] > 0
    assert rec["pv_capacity_wp"] > 0
    assert rec["battery_energy_wh"] > 0
    assert rec["explanation"]
    assert rec["triggered_rules"]
    # Delete works
    assert client.delete(f"/api/recommendations/{rec['id']}", headers=h).status_code == 200
    assert client.get(f"/api/recommendations/{rec['id']}", headers=h).status_code == 404


def test_chat_validation(client, user_token):
    r = client.post("/api/chat", headers=auth(user_token), json={"message": "", "history": []})
    assert r.status_code == 400
