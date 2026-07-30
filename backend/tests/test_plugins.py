from pathlib import Path

from app.plugins.loader import PluginRegistry


PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins"


def test_load_plugin_manifest_and_presets():
    plugin = PluginRegistry(PLUGIN_ROOT).load("twin-fpv-sub250")
    assert plugin.manifest["version"] == "0.1.2"
    assert {preset["name"] for preset in plugin.presets} == {"Trainer", "FPV Cruiser"}


def test_evaluate_trainer_preset():
    registry = PluginRegistry(PLUGIN_ROOT)
    plugin = registry.load("twin-fpv-sub250")
    trainer = next(preset for preset in plugin.presets if preset["name"] == "Trainer")
    result = registry.evaluate("twin-fpv-sub250", trainer["parameters"])
    assert not any(message["severity"] == "error" for message in result["messages"])
    assert result["calculations"]["wingAreaMm2"] > 0
    assert len(result["geometry"]["wingOutline"]) == 7
    assert result["geometry"]["motorPositions"] == [[55.0, 180.0], [55.0, -180.0]]


def test_rejects_motor_positions_outside_wing():
    registry = PluginRegistry(PLUGIN_ROOT)
    plugin = registry.load("twin-fpv-sub250")
    parameters = next(preset for preset in plugin.presets if preset["name"] == "Trainer")["parameters"]
    parameters["propulsion"]["motorSpacingMm"] = parameters["wing"]["spanMm"]
    result = registry.evaluate("twin-fpv-sub250", parameters)
    assert result["geometry"] == {}
    assert any(message["code"] == "motor-spacing" for message in result["messages"])


def test_rejects_different_airfoil_kinds():
    registry = PluginRegistry(PLUGIN_ROOT)
    plugin = registry.load("twin-fpv-sub250")
    parameters = next(preset for preset in plugin.presets if preset["name"] == "Trainer")["parameters"]
    parameters["airfoils"] = {
        "root": {"id": "root", "name": "Wurzel", "kind": "conventional"},
        "tip": {"id": "tip", "name": "Rand", "kind": "kfm2"},
    }
    result = registry.evaluate("twin-fpv-sub250", parameters)
    assert result["geometry"] == {}
    assert any(message["code"] == "airfoil-kind-mismatch" for message in result["messages"])


def test_plugin_api(admin):
    client, csrf = admin["client"], admin["csrf"]
    listing = client.get("/api/v1/plugins")
    assert listing.status_code == 200
    assert listing.json()[0]["manifest"]["id"] == "twin-fpv-sub250"
    parameters = listing.json()[0]["presets"][0]["parameters"]
    evaluation = client.post(
        "/api/v1/plugins/twin-fpv-sub250/evaluate",
        headers={"X-CSRF-Token": csrf},
        json={"parameters": parameters},
    )
    assert evaluation.status_code == 200
    assert evaluation.json()["calculations"]["aspectRatio"] > 0
