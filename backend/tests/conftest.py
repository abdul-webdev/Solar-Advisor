import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["SOLAR_DB_PATH"] = os.path.join(os.path.dirname(__file__), "test_solar.db")

# Fresh DB for the test session
if os.path.exists(os.environ["SOLAR_DB_PATH"]):
    os.remove(os.environ["SOLAR_DB_PATH"])

import pytest

from app import create_app
from app.database import seed


@pytest.fixture(scope="session")
def app():
    seed()
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def user_token(client):
    r = client.post("/api/auth/login", json={"email": "user@example.com", "password": "User@12345"})
    assert r.status_code == 200
    return r.get_json()["token"]


@pytest.fixture()
def admin_token(client):
    r = client.post("/api/auth/login", json={"email": "admin@solaradvisor.com", "password": "Admin@12345"})
    assert r.status_code == 200
    return r.get_json()["token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}
