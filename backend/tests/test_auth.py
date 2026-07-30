def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["version"] == "0.1.7"


def test_login_and_profile(admin):
    response = admin["client"].put("/api/v1/profile", headers={"X-CSRF-Token": admin["csrf"]}, json={
        "email": "admin@example.test", "display_name": "Test Admin", "theme": "dark"
    })
    assert response.status_code == 200
    assert response.json()["display_name"] == "Test Admin"


def test_csrf_is_required(admin):
    response = admin["client"].put("/api/v1/profile", json={
        "email": "admin@example.test", "display_name": "Test Admin", "theme": "dark"
    })
    assert response.status_code == 403


def test_admin_can_create_user(admin):
    response = admin["client"].post(
        "/api/v1/admin/users", headers={"X-CSRF-Token": admin["csrf"]},
        json={"email": "user@example.test", "display_name": "User",
              "password": "another-secure-password", "role": "user"})
    assert response.status_code == 201
    assert response.json()["role"] == "user"
