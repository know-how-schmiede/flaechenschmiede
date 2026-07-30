import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["APP_SECRET_KEY"] = "test-secret-key-with-at-least-32-characters"

import pytest
from fastapi.testclient import TestClient

from app.auth.security import hash_password
from app.core.database import Base, SessionLocal, engine
from app.main import app
from app.models.user import User, UserRole


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add(User(email="admin@example.test", display_name="Admin",
                    password_hash=hash_password("A-secure-test-password"), role=UserRole.ADMIN))
        db.commit()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin(client):
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@example.test", "password": "A-secure-test-password"
    })
    assert response.status_code == 200
    return {"client": client, "csrf": response.json()["csrf_token"]}
