# FlächenSchmiede im Debian-LXC einrichten

Diese Anleitung richtet sich an Einsteiger. Die Skripte sind für einen
**unprivilegierten Debian-LXC unter Proxmox** vorbereitet. FlächenSchmiede
befindet sich noch im Aufbau: Das Grundsystem kann vorbereitet werden, Backend,
Frontend, Datenbankmigrationen und Dienste werden aber erst mit der jeweiligen
Entwicklungsphase vollständig aktiviert.

## Was die Skripte machen

| Skript | Aufgabe |
| --- | --- |
| `install.sh` | Debian prüfen, Pakete installieren, Systembenutzer und Verzeichnisse anlegen, Repository klonen |
| `update.sh` | Änderungen aus Git laden, später Abhängigkeiten, Migrationen und Frontend-Build aktualisieren |
| `reset-admin-password.sh` | später die Backend-CLI für einen sicheren Admin-Passwort-Reset aufrufen |

Die Skripte verwenden standardmäßig:

- Programmcode: `/opt/flaechenschmiede`
- Konfiguration: `/etc/flaechenschmiede/flaechenschmiede.env`
- Daten und Exporte: `/var/lib/flaechenschmiede`
- Systembenutzer: `flaechenschmiede`

## 1. LXC in Proxmox vorbereiten

Empfohlene Ausgangsbasis:

- aktuelles Debian-Template
- unprivilegierter Container
- mindestens 2 CPU-Kerne
- mindestens 2 GB RAM
- mindestens 10 GB Speicher
- feste IP-Adresse oder DHCP-Reservierung
- funktionierender DNS- und Internetzugang

Nach dem Erstellen den Container starten und über die Proxmox-Konsole als
`root` anmelden.

System aktualisieren:

```bash
apt update
apt full-upgrade -y
reboot
```

Nach dem Neustart erneut anmelden und Git sowie Zertifikate installieren:

```bash
apt update
apt install -y git ca-certificates
```

Zeit und Netzwerk prüfen:

```bash
date
ip address
ping -c 3 github.com
```

## 2. Git kurz erklärt

Git verwaltet den Projektstand. Die wichtigsten Begriffe:

- **Repository:** Projektordner mit Versionshistorie
- **Branch:** Entwicklungszweig, normalerweise `main`
- **Clone:** erstmalige lokale Kopie eines Repositorys
- **Fetch:** neue Informationen vom Server abrufen
- **Pull:** Änderungen abrufen und in den aktuellen Branch übernehmen
- **Status:** lokale Änderungen anzeigen

Die URL des Repositorys auf GitHub öffnen, dort **Code** wählen und die
HTTPS-URL kopieren. Sie sieht ungefähr so aus:

```text
https://github.com/DEIN-NAME/flaechenschmiede.git
```

Repository zunächst nach `/root` klonen:

```bash
cd /root
git clone https://github.com/DEIN-NAME/flaechenschmiede.git
cd flaechenschmiede
```

Aktuellen Stand und Branch ansehen:

```bash
git status
git branch --show-current
git log -5 --oneline
```

Tipp: Bei einem privaten Repository fragt Git nach Zugangsdaten. GitHub
akzeptiert für HTTPS kein normales Kontopasswort. Verwende ein Personal Access
Token oder einen eingerichteten SSH-Schlüssel. Tokens dürfen nie in Befehle,
Screenshots, `.env`-Vorlagen oder das Repository kopiert werden.

## 3. Setup prüfen

Die Skripte nach dem Klonen ausführbar machen:

```bash
cd /root/flaechenschmiede
chmod +x setup/*.sh
```

Zuerst nur prüfen; dieser Befehl verändert nichts:

```bash
sudo ./setup/install.sh --check
```

Hilfe anzeigen:

```bash
./setup/install.sh --help
```

## 4. Grundinstallation starten

Die echte Repository-URL einsetzen:

```bash
cd /root/flaechenschmiede
sudo ./setup/install.sh \
  --repository https://github.com/DEIN-NAME/flaechenschmiede.git \
  --branch main
```

Das Skript klont eine saubere Laufzeitkopie nach `/opt/flaechenschmiede`.
Der Clone unter `/root/flaechenschmiede` bleibt nur zum Starten und Prüfen des
Setups bestehen.

Anschließend die erzeugte Konfiguration öffnen:

```bash
nano /etc/flaechenschmiede/flaechenschmiede.env
```

Mindestens `APP_SECRET_KEY`, Datenbankzugang und Produktionsoptionen müssen vor
dem späteren Produktivstart angepasst werden. Einen zufälligen Secret-Key
erzeugen:

```bash
openssl rand -hex 32
```

Den ausgegebenen Wert in die Konfigurationsdatei kopieren. Die Datei selbst
darf nicht in Git eingecheckt werden.

## 5. Anwendung aktualisieren

Vor jedem Update empfiehlt sich ein Snapshot oder Backup in Proxmox. Danach:

```bash
cd /opt/flaechenschmiede
sudo bash ./setup/update.sh
```

Das Update wird abgebrochen, wenn im Laufzeit-Repository lokale Änderungen
vorhanden sind oder kein Fast-Forward möglich ist. Das schützt vor dem
versehentlichen Überschreiben manueller Änderungen.

Nützliche Prüfungen:

```bash
cd /opt/flaechenschmiede
git status
git log -5 --oneline
git remote -v
```

Nur ansehen, welche Änderungen auf dem Server verfügbar sind:

```bash
cd /opt/flaechenschmiede
sudo -u flaechenschmiede git fetch origin
git log --oneline HEAD..origin/main
```

Keine Produktionsdateien mit `git reset --hard` oder durch Löschen von
Verzeichnissen „reparieren“. Bei Konflikten zuerst `git status` und die
Fehlermeldung sichern.

## 6. Admin-Passwort zurücksetzen

Dieser Befehl funktioniert, sobald Benutzerverwaltung und Backend-CLI
implementiert sind:

```bash
cd /opt/flaechenschmiede
sudo bash ./setup/reset-admin-password.sh admin@example.org
```

Das Passwort wird später verdeckt abgefragt. Es wird bewusst nicht direkt im
Befehl angegeben, damit es weder in der Shell-Historie noch in der
Prozessliste erscheint.

## 7. Fehler suchen

Installationspfade und Rechte prüfen:

```bash
ls -la /opt/flaechenschmiede
ls -la /etc/flaechenschmiede
ls -la /var/lib/flaechenschmiede
```

Spätere Backend-Logs über systemd ansehen:

```bash
systemctl status flaechenschmiede-backend.service
journalctl -u flaechenschmiede-backend.service -n 100 --no-pager
```

Nginx-Konfiguration prüfen:

```bash
nginx -t
systemctl status nginx --no-pager
```

PostgreSQL prüfen:

```bash
systemctl status postgresql --no-pager
```

Bei einer Fehlermeldung sind diese Informationen hilfreich:

```bash
cat /etc/os-release
uname -a
git -C /opt/flaechenschmiede status
git -C /opt/flaechenschmiede log -1 --oneline
```

Geheimnisse aus Ausgaben entfernen, bevor sie in ein Issue oder einen Chat
kopiert werden.

## 8. Wichtige Sicherheitsregeln

- LXC und Pakete regelmäßig aktualisieren.
- Keine Passwörter oder Tokens in Git speichern.
- Die Anwendung nicht ohne TLS öffentlich freigeben.
- Datenbank und Backend nicht direkt ins Internet veröffentlichen.
- Vor Updates Datenbank und persistente Dateien sichern.
- Für die Administration möglichst SSH-Schlüssel statt Passwörter verwenden.
- Konfigurationsdateien nur für `root` und die Anwendungsgruppe lesbar halten.

Die endgültige Nginx-, PostgreSQL-, systemd-, Backup- und TLS-Konfiguration wird
ergänzt, sobald die Anwendung lauffähig ist.
