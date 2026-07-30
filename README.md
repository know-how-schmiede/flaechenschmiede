# FlächenSchmiede

FlächenSchmiede ist eine modulare, webbasierte Konstruktionshilfe für
parametrische RC-Flugmodelle. Flugzeugparameter werden im Browser eingestellt,
unmittelbar als 2D- und 3D-Modell dargestellt und anschließend als
maßstäbliche PDF- und SVG-Bauunterlagen exportiert.

Der erste Anwendungsfall ist ein einfacher zweimotoriger FPV-Flieger mit einem
Zielgewicht unter 250 g. Weitere Modelltypen werden über vertrauenswürdige,
serverseitig installierte Geometrie-Plugins ergänzt.

> **Projektstatus:** frühe, lauffähige Projektphase. Anmeldung, Profil- und
> Benutzerverwaltung, Profilbibliothek sowie 2D-/3D-Modellvorschau sind nutzbar.

## Ziele des MVP

- Benutzerkonten, Rollen und persönliche Projekte
- versionierte, deklarative Geometrie-Plugins
- klassische Tragflächenprofile sowie parametrische KFm1-, KFm2- und
  KFm4-Profile
- reaktive 2D- und 3D-Vorschau
- geometrische und gewichtsbezogene Berechnungen
- strukturierte Hinweise, Empfehlungen, Warnungen und Fehler
- maßstäbliche Exporte als PDF und SVG
- reproduzierbarer Betrieb in einem Debian-LXC unter Proxmox

Berechnete Werte sind Konstruktionshilfen. Sie stellen keine Garantie für
Flugtauglichkeit oder Betriebssicherheit dar.

## Technischer Ansatz

| Bereich | Vorgesehene Technologien |
| --- | --- |
| Frontend | React, TypeScript, Vite, Material UI, React Three Fiber |
| Backend | Python 3.12+, FastAPI, Pydantic, SQLAlchemy 2, Alembic |
| Geometrie | NumPy, Shapely, trimesh |
| Export | ReportLab, svgwrite |
| Datenbank | PostgreSQL |
| Betrieb | Nginx, systemd und/oder Docker Compose |

Die REST-API wird unter `/api/v1` versioniert. Längen werden intern in
Millimetern, Massen in Gramm und Winkel in Grad gespeichert.
Schema-Änderungen (z. B. neue Tabellen, Spalten, Indizes oder Constraints)
werden von Beginn an ausschließlich über versionierte Alembic-Migrationen
eingeführt.

Frontend-Framework: React mit TypeScript und Vite.
Backend-Framework: FastAPI mit Pydantic, SQLAlchemy 2 und Alembic.

Das UI wird als modernes, token-basiertes Designsystem aufgebaut.
Von Beginn an sind eine helle und eine dunkle Oberfläche vorgesehen.
Die Auswahl wird später pro Benutzerprofil gespeichert.

## Repository-Struktur

```text
.
├── airfoils/                 # Vom Geometrie-Plugin getrennte Profilbibliothek
│   ├── conventional/         # Klassische Koordinatenprofile
│   └── kfm/                  # Parametrische KF-Profildefinitionen
├── backend/
│   ├── app/
│   │   ├── airfoils/         # Profilverwaltung und -generierung
│   │   ├── api/              # Versionierte HTTP-Endpunkte
│   │   ├── auth/             # Anmeldung, Sitzungen und Rechte
│   │   ├── core/             # Konfiguration und Querschnittsfunktionen
│   │   ├── exporters/        # PDF-, SVG- und JSON-Ausgabe
│   │   ├── geometry/         # Framework-unabhängige Geometrie
│   │   ├── models/           # SQLAlchemy-Modelle
│   │   ├── plugins/          # Plugin-Lader und Verträge
│   │   └── schemas/          # Pydantic- und API-Schemas
│   ├── migrations/           # Alembic-Migrationen
│   └── tests/                # Backend-Tests
├── deployment/
│   ├── nginx/
│   ├── scripts/
│   └── systemd/
├── docs/                     # Architektur- und Betriebsdokumentation
├── designtests/              # UI-Prototypen für Light/Dark und Komponenten
├── frontend/
│   ├── public/
│   └── src/
├── plugins/
│   └── twin-fpv-sub250/      # Erstes Geometrie-Plugin
├── setup/                    # Installation, Updates und Administration im LXC
└── tests/
    ├── fixtures/
    └── integration/
```

Die Verzeichnisse enthalten Platzhalter, bis die jeweilige Entwicklungsphase
beginnt. Das Plugin-Grundgerüst enthält bereits ein Manifest, ein
Parameterschema und zwei Preset-Dateien.

## Design-Prototypen

Im Verzeichnis `designtests/` liegen HTML/CSS/JS-Beispiele mit zentralen UI-
Elementen (Navigation, Formulare, Tabellen, Karten, Statusanzeigen, Dialoge,
Benachrichtigungen). Sie dienen als visuelle und technische Basis, um spätere
Formatierungsregeln und CSS-Konventionen festzulegen.

## Lokale Entwicklung

Der schnellste Testweg für Version 0.4.1 ist Docker:

```bash
docker compose up --build -d
docker compose exec backend python -m app.cli
```

Die Oberfläche ist anschließend unter `http://localhost:5173`, die
API-Dokumentation unter `http://localhost:8000/docs` erreichbar. Der zweite
Befehl legt interaktiv den ersten Administrator an.

### Installation in einem Debian-LXC

In einem frischen, unprivilegierten Debian-LXC:

```bash
git clone <REPOSITORY-URL> /tmp/flaechenschmiede-installer
cd /tmp/flaechenschmiede-installer
sudo ./setup/install.sh --repository <REPOSITORY-URL> --branch main
```

Das Skript installiert PostgreSQL, Python, Node.js, Nginx und den
systemd-Dienst, erzeugt zufällige Zugangsdaten, migriert die Datenbank und baut
das Frontend. Am Ende wird der Befehl zum Anlegen des ersten Administrators
ausgegeben. Vor öffentlichem Betrieb sind HTTPS einzurichten und
`SESSION_COOKIE_SECURE=true` zu setzen.

Schemaänderungen ohne Migration gelten als unvollständig und werden nicht
übernommen.

Konfiguration erfolgt ausschließlich über Umgebungsvariablen. Als Vorlage
dient `.env.example`; echte Geheimnisse dürfen nicht committed werden.

## Entwicklungsphasen

1. **Projektfundament:** Entwicklungsumgebung, FastAPI, React, PostgreSQL,
   Migrationen, Tests, CI, Anmeldung und Rollen
2. **Profilsystem:** Datenmodell, Import, klassische Profile und KFm-Generatoren
3. **Geometrie-Plugin:** Plugin-Lader, `twin-fpv-sub250`, Berechnungen,
   Validierung und 2D-Vorschau
4. **3D-Vorschau:** React Three Fiber, Ansichten und Performance
5. **Projekte und Export:** Projektverwaltung, JSON, PDF, SVG und Historie
6. **Betrieb:** Proxmox, Nginx, Dienste, Backups und Monitoring

## Mitwirken und Dokumentation

- [Beitragsrichtlinien](CONTRIBUTING.md)
- [Architektur](docs/architecture.md)
- [Plugin-Entwicklung](docs/plugin-development.md)
- [Profilformat](docs/airfoil-format.md)
- [Proxmox-Deployment](docs/deployment-proxmox.md)
- [Setup für Einsteiger](setup/setup.md)
- [Sicherheitsgrundsätze](docs/security.md)
- [Änderungshistorie](CHANGELOG.md)

## Offene Entscheidungen

- endgültige Open-Source-Lizenz
- öffentliche oder administrativ freigegebene Registrierung
- primärer Produktionsweg: native LXC-Installation oder Docker Compose
- Umfang der E-Mail-Funktionen im MVP
- lizenzrechtlich geprüfte Quellen der Startprofile
- Standardabmessungen des ersten Sub-250-g-Modells
- Umfang der Schwerpunkt- und Leitwerksberechnung

Bis eine Lizenz gewählt wurde, werden keine Nutzungsrechte über die
gesetzlichen Standardrechte hinaus eingeräumt; siehe [LICENSE](LICENSE).
