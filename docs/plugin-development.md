# Plugin-Entwicklung

Geometrie-Plugins sind vertrauenswürdiger Python-Code im Repository. Im MVP
können nur Administratoren geprüfte Plugins aktivieren oder deaktivieren; ein
Upload beliebiger Python-Pakete über die Weboberfläche ist nicht vorgesehen.

Ein Plugin enthält mindestens:

- `plugin.json` mit ID, Version, Core-Anforderung und Einstiegspunkten
- `parameters.schema.json` mit Standardwerten und Wertebereichen
- Geometrie-, Berechnungs- und Validierungsmodule
- versionierte Presets unter `defaults/`

Standardparameter sollen ohne pluginspezifische React-Komponenten aus dem
deklarativen Schema gerendert werden. Der endgültige Python-Vertrag und das
Manifest-Schema werden mit dem Plugin-Lader in Phase 2 festgelegt.
