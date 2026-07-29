# Mitwirken

FlächenSchmiede befindet sich im Aufbau. Beiträge sollten klein,
nachvollziehbar und einer Entwicklungsphase zugeordnet sein.

## Grundregeln

- Geometriecode bleibt vom Webframework getrennt.
- Profilbibliothek und Geometrie-Plugins bleiben unabhängig.
- Plugin-, Projekt- und API-Schemas werden versioniert.
- Datenbankänderungen enthalten immer eine Alembic-Migration.
- Änderungen an Tabellen, Feldern, Indizes oder Constraints ohne Migration
  werden nicht gemergt.
- Pull Requests mit Migrationen enthalten eine kurze Vorwärts- und
  Rückwärtsstrategie (Upgrade/Downgrade) sowie Hinweise auf Datenrisiken.
- Neue Berechnungen erhalten Unit-Tests mit festen Erwartungswerten.
- Sicherheits- und Berechtigungsprüfungen werden serverseitig erzwungen.
- Neue große Abhängigkeiten werden im Pull Request begründet.
- Dokumentation und `.env.example` werden bei Konfigurationsänderungen
  aktualisiert.
- UI-Änderungen berücksichtigen Light- und Dark-Theme gleichwertig.
- Wiederverwendbare Stilentscheidungen werden vor der Implementierung in
  `designtests/` nachvollziehbar dokumentiert und abgestimmt.

Vor Abschluss einer Änderung sind die betroffenen Tests, Linter und Builds
auszuführen. Die konkreten Befehle werden mit der Entwicklungsumgebung in
Phase 0 ergänzt.
