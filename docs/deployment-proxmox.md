# Deployment unter Proxmox

Ziel ist ein unprivilegierter Debian-LXC mit Nginx, dauerhaftem
FastAPI-Prozess, PostgreSQL und persistenten Verzeichnissen für Exporte und
Backups.

Für einen einzelnen LXC wird zunächst eine native Installation mit systemd
bevorzugt. `compose.yaml` unterstützt die lokale Entwicklung und eine spätere
VPS-Bereitstellung. Die endgültige Betriebsentscheidung ist noch offen.

Die Anwendung darf keine Proxmox-spezifischen Annahmen enthalten. Sämtliche
Umgebungseinstellungen und Geheimnisse werden außerhalb des Repositories über
Umgebungsvariablen bereitgestellt.
