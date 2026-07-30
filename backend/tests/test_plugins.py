from pathlib import Path

from app.plugins.loader import PluginRegistry


PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins"


def test_load_plugin_manifest_and_presets():
    plugin = PluginRegistry(PLUGIN_ROOT).load("twin-fpv-sub250")
    assert plugin.manifest["version"] == "0.1.0"
    assert {preset["name"] for preset in plugin.presets} == {"Trainer", "FPV Cruiser"}


def test_evaluate_trainer_preset():
    registry = PluginRegistry(PLUGIN_ROOT)
    plugin = registry.load("twin-fpv-sub250")
    result = registry.evaluate("twin-fpv-sub250", plugin.presets[0]["parameters"])
    assert not any(message["severity"] == "error" for message in result["messages"])
    assert result["calculations"]["wingAreaMm2"] > 0
    assert len(result["geometry"]["wingOutline"]) == 7


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
