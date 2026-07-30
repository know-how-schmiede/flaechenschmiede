import importlib.util
import json
import re
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType

from app.core.config import get_settings

PLUGIN_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{1,63}$")
REQUIRED_ENTRY_POINTS = ("geometry", "calculations", "validation")


class PluginError(ValueError):
    pass


@dataclass(frozen=True)
class LoadedPlugin:
    manifest: dict
    schema: dict
    presets: list[dict]
    modules: dict[str, ModuleType]

    def public_definition(self) -> dict:
        return {
            "manifest": self.manifest,
            "schema": self.schema,
            "presets": self.presets,
        }


def _read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise PluginError(f"Ungültige Plugin-Datei: {path.name}") from exc


def _load_module(plugin_id: str, role: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(
        f"flaechenschmiede_plugin_{plugin_id.replace('-', '_')}_{role}", path
    )
    if not spec or not spec.loader:
        raise PluginError(f"Einstiegspunkt {role} kann nicht geladen werden.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PluginRegistry:
    def __init__(self, root: str | Path | None = None):
        configured = root or get_settings().plugin_directory
        self.root = Path(configured).resolve()

    def list(self) -> list[LoadedPlugin]:
        if not self.root.is_dir():
            return []
        plugins = []
        for directory in sorted(self.root.iterdir()):
            if directory.is_dir() and (directory / "plugin.json").is_file():
                plugins.append(self.load(directory.name))
        return plugins

    def load(self, plugin_id: str) -> LoadedPlugin:
        if not PLUGIN_ID_PATTERN.fullmatch(plugin_id):
            raise PluginError("Ungültige Plugin-ID.")
        directory = (self.root / plugin_id).resolve()
        if directory.parent != self.root or not directory.is_dir():
            raise PluginError("Plugin nicht gefunden.")
        manifest = _read_json(directory / "plugin.json")
        if manifest.get("id") != plugin_id or manifest.get("schemaVersion") != "1.0":
            raise PluginError("Plugin-Manifest ist nicht kompatibel.")
        entry_points = manifest.get("entryPoints")
        if not isinstance(entry_points, dict):
            raise PluginError("Plugin-Einstiegspunkte fehlen.")
        modules: dict[str, ModuleType] = {}
        for role in REQUIRED_ENTRY_POINTS:
            filename = entry_points.get(role)
            if not isinstance(filename, str) or Path(filename).name != filename:
                raise PluginError(f"Ungültiger Einstiegspunkt: {role}")
            path = (directory / filename).resolve()
            if path.parent != directory or not path.is_file():
                raise PluginError(f"Einstiegspunkt fehlt: {role}")
            modules[role] = _load_module(plugin_id, role, path)
        schema = _read_json(directory / "parameters.schema.json")
        presets = [
            _read_json(path)
            for path in sorted((directory / "defaults").glob("*.json"))
        ] if (directory / "defaults").is_dir() else []
        return LoadedPlugin(manifest, schema, presets, modules)

    def evaluate(self, plugin_id: str, parameters: dict) -> dict:
        plugin = self.load(plugin_id)
        messages = plugin.modules["validation"].validate(parameters)
        if any(item.get("severity") == "error" for item in messages):
            return {"parameters": parameters, "messages": messages,
                    "calculations": {}, "geometry": {}}
        calculations = plugin.modules["calculations"].calculate(parameters)
        geometry = plugin.modules["geometry"].build_geometry(parameters)
        return {
            "parameters": parameters,
            "messages": messages,
            "calculations": calculations,
            "geometry": geometry,
        }
