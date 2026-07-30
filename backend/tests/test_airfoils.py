import pytest

from app.airfoils.service import AirfoilDataError, generate_kfm, parse_dat
from app.models.airfoil import AirfoilKind


def test_parse_selig_dat():
    coordinates = parse_dat(
        "Demo\n1.0 0.0\n0.5 0.08\n0.0 0.0\n0.5 -0.04\n1.0 0.0"
    )
    assert len(coordinates) == 5
    assert coordinates[1] == [0.5, 0.08]


def test_reject_invalid_dat():
    with pytest.raises(AirfoilDataError):
        parse_dat("Demo\n1 0\n2 1")


def test_generate_all_kfm_profiles():
    for kind in (AirfoilKind.KFM1, AirfoilKind.KFM2, AirfoilKind.KFM4):
        coordinates = generate_kfm(kind, 0.5, 0.08)
        assert len(coordinates) >= 5
        assert all(0 <= point[0] <= 1 for point in coordinates)


def test_admin_creates_and_deactivates_airfoil(admin):
    client, csrf = admin["client"], admin["csrf"]
    response = client.post(
        "/api/v1/admin/airfoils",
        headers={"X-CSRF-Token": csrf},
        json={
            "name": "Test KFm4", "kind": "kfm4", "description": "Test",
            "step_position": 0.5, "thickness": 0.08,
        },
    )
    assert response.status_code == 201
    airfoil = response.json()
    assert airfoil["kind"] == "kfm4"
    assert len(airfoil["coordinates"]) == 5

    listing = client.get("/api/v1/airfoils")
    assert listing.status_code == 200
    assert listing.json()[0]["name"] == "Test KFm4"

    updated = client.patch(
        f"/api/v1/admin/airfoils/{airfoil['id']}",
        headers={"X-CSRF-Token": csrf},
        json={"is_active": False},
    )
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False
