# Sicherheitsgrundsätze

- Passwörter werden bevorzugt mit Argon2id gehasht.
- Sitzungen werden serverseitig kontrolliert.
- Cookies sind HTTP-only und in Produktion `Secure`; `SameSite` wird explizit
  konfiguriert.
- Zustandsändernde Anfragen erhalten CSRF-Schutz.
- Anmeldung und Registrierung werden begrenzt.
- Authentifizierungstoken werden nicht in `localStorage` gespeichert.
- Jede Projektoperation prüft Autorisierung und Eigentümerschaft serverseitig.
- Eingaben und Dateiinhalte werden auf Client und Server validiert.
- Administrative Änderungen werden revisionssicher protokolliert.
- Exportpfade sind kontrolliert und werden nicht als interne Pfade offengelegt.
- Datenbankschema und Migrationen sind ab der ersten produktiven Tabelle
  verpflichtend integriert.
- Tabellen-, Feld-, Index- und Constraint-Änderungen erfolgen ausschließlich
  über versionierte Alembic-Migrationen.
- Direkte, manuelle Schemaänderungen in Staging oder Produktion sind unzulässig.
- Jede Schema-Migration wird vor dem Deployment in Test- und
  Staging-Umgebungen validiert.

Ein späterer Plugin-Installer benötigt zusätzlich Schema- und
Versionsprüfung, Prüfsummen, sichere Entpackung, Größenlimits und gegebenenfalls
isolierte Ausführung.
