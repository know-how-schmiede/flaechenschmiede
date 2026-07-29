# Architektur

FlächenSchmiede ist als Monorepo mit getrenntem React-Frontend,
FastAPI-Backend, Profilbibliothek und serverseitigen Geometrie-Plugins
organisiert.

## Framework-Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI + Pydantic + SQLAlchemy 2 + Alembic
- Datenbank: PostgreSQL

## Leitlinien

- Die verbindliche Validierung und Exportgeometrie entstehen serverseitig.
- Das Frontend darf Vorschaugeometrie für kurze Reaktionszeiten lokal
  berechnen.
- Geometrie- und Berechnungscode hängt nicht von FastAPI oder der Datenbank ab.
- Projekte speichern Schema-, Plugin- und Profilversion sowie das
  Einheitensystem.
- Öffentliche Kennungen sind UUIDs; interne Dateipfade werden nie ausgeliefert.
- Länger laufende Exporte werden später als Hintergrundjobs ausgeführt.

## UI- und Theme-Strategie

- Das Frontend nutzt ein token-basiertes Designsystem mit CSS-Variablen.
- Es gibt eine helle und eine dunkle Oberfläche als gleichwertige Varianten.
- Die Theme-Wahl wird später im Benutzerprofil gespeichert und serverseitig
  persistiert.
- Das Verzeichnis `designtests/` enthält Referenzlayouts mit allen
  wiederverwendbaren UI-Elementen als Grundlage für spätere
  Formatierungsregeln.

## Wesentliche Datenobjekte

Vorgesehen sind `User`, `Role`, `UserRole`, `Session`, `Project`,
`ProjectRevision`, `Airfoil`, `AirfoilVersion`, `Plugin`, `PluginVersion`,
`ExportJob`, `SystemSetting` und `AuditEvent`.

Architekturentscheidungen werden bei Beginn der Implementierung als
Architecture Decision Records unter `docs/decisions/` ergänzt.
