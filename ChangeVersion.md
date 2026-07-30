# Versionshistorie

## 0.1.6 – 2026-07-30

- Gebautes Frontend wird getrennt vom geschützten Anwendungscode unter
  `/var/www/flaechenschmiede` für Nginx bereitgestellt.
- Update-Ablauf synchronisiert Frontend-Dateien und lädt Nginx anschließend
  neu.

## 0.1.5 – 2026-07-30

- Nginx wird nach Installation der Anwendungskonfiguration explizit neu
  gestartet, damit nicht die bereits geladene Debian-Startseite aktiv bleibt.

## 0.1.4 – 2026-07-30

- LXC-Hinweis zur Admin-Erstellung lädt nun zuerst die Produktionskonfiguration,
  sodass die CLI PostgreSQL statt der lokalen SQLite-Vorgabe verwendet.

## 0.1.3 – 2026-07-30

- Hinweis zum Erstellen des ersten Administrators verwendet jetzt `runuser`
  und funktioniert damit auch in minimalen Debian-LXC ohne `sudo`.

## 0.1.2 – 2026-07-30

- Neue PostgreSQL-Datenbanken werden im LXC explizit mit UTF-8 angelegt.
- Installation prüft das Datenbank-Encoding vor Backend-Migrationen und meldet
  inkompatible Bestandsdatenbanken verständlich.

## 0.1.1 – 2026-07-30

- LXC-Migration von einem unzulässigen relativen `.env`-Zugriff entkoppelt.
- Docker-Buildfehler im React-`useEffect` behoben.
- CORS-Konfiguration für kommaseparierte Umgebungswerte korrigiert.
- Versionsmodul in das installierbare Backend-Paket aufgenommen.
- Lokalen Docker-Start einschließlich Migration und Health-Endpunkt geprüft.

## 0.1.0 – 2026-07-30

- Grundgerüst für FastAPI, React, PostgreSQL und Alembic erstellt.
- Anmeldung mit serverseitigen Sitzungen, HttpOnly-Cookie und CSRF-Schutz ergänzt.
- Profilseite zum Ändern von Name, E-Mail, Theme und Passwort umgesetzt.
- Rollenbasierte Benutzerverwaltung für Administratoren ergänzt.
- LXC-Installation mit Nginx und systemd sowie lokale Docker-Testumgebung vorbereitet.
