#!/usr/bin/env bash

# Bereitet einen Debian-LXC für FlächenSchmiede vor.
# Die Anwendungsinstallation wird mit wachsendem Projektumfang ergänzt.

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
  cat <<'EOF'
Aufruf:
  sudo ./setup/install.sh --repository URL [--branch BRANCH]
  sudo ./setup/install.sh --check

Optionen:
  --repository URL   HTTPS- oder SSH-URL des Git-Repositories
  --branch BRANCH    Zu installierender Branch (Standard: main)
  --check            Nur Voraussetzungen prüfen, nichts verändern
  --help             Diese Hilfe anzeigen
EOF
}

repository_url="${FS_REPOSITORY_URL:-}"
branch="${FS_GIT_BRANCH:-main}"
check_only=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repository)
      [[ $# -ge 2 ]] || fail "Nach --repository fehlt die URL."
      repository_url="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || fail "Nach --branch fehlt der Branch."
      branch="$2"
      shift 2
      ;;
    --check)
      check_only=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      fail "Unbekannte Option: $1"
      ;;
  esac
done

require_root

if [[ ! -r /etc/os-release ]]; then
  fail "/etc/os-release fehlt; unterstützt wird Debian in einem LXC."
fi

# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == "debian" ]] ||
  fail "Dieses vorbereitete Setup unterstützt derzeit nur Debian."

log "Debian ${VERSION_ID:-unbekannt} erkannt."

if $check_only; then
  for command_name in apt-get systemctl runuser; do
    require_command "$command_name"
  done
  log "Grundvoraussetzungen sind vorhanden. Es wurden keine Änderungen vorgenommen."
  exit 0
fi

[[ -n "$repository_url" ]] ||
  fail "Repository fehlt. Verwende --repository URL oder FS_REPOSITORY_URL."

log "Installiere Systempakete."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git nginx openssl postgresql python3 python3-venv \
  python3-pip rsync nodejs npm
systemctl enable --now postgresql

if ! getent group "$FS_APP_GROUP" >/dev/null; then
  groupadd --system "$FS_APP_GROUP"
fi
if ! id "$FS_APP_USER" >/dev/null 2>&1; then
  useradd \
    --system \
    --gid "$FS_APP_GROUP" \
    --home-dir "$FS_DATA_DIR" \
    --create-home \
    --shell /usr/sbin/nologin \
    "$FS_APP_USER"
fi

install -d -o "$FS_APP_USER" -g "$FS_APP_GROUP" -m 0750 \
  "$FS_INSTALL_DIR" "$FS_DATA_DIR" "${FS_DATA_DIR}/exports"
install -d -o root -g "$FS_APP_GROUP" -m 0750 "$FS_CONFIG_DIR"

if [[ -d "${FS_INSTALL_DIR}/.git" ]]; then
  fail "${FS_INSTALL_DIR} enthält bereits eine Installation. Nutze update.sh."
fi
if [[ -n "$(find "$FS_INSTALL_DIR" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  fail "${FS_INSTALL_DIR} ist nicht leer. Inhalt bitte zuerst prüfen."
fi

log "Klone Branch ${branch} nach ${FS_INSTALL_DIR}."
run_as_app_user git clone --branch "$branch" --single-branch \
  "$repository_url" "$FS_INSTALL_DIR"

environment_created=false
if [[ ! -f "$FS_ENV_FILE" ]]; then
  install -o root -g "$FS_APP_GROUP" -m 0640 \
    "${FS_INSTALL_DIR}/.env.example" "$FS_ENV_FILE"
  environment_created=true
  log "Konfiguration angelegt: ${FS_ENV_FILE}"
  log "WICHTIG: Geheimnisse und Produktionswerte müssen dort noch angepasst werden."
fi

if $environment_created; then
  log "Richte PostgreSQL-Datenbank und Produktionskonfiguration ein."
  db_password="$(openssl rand -hex 24)"
  secret_key="$(openssl rand -hex 32)"
  runuser --user postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='flaechenschmiede'" | grep -q 1 ||
    runuser --user postgres -- psql -c "CREATE ROLE flaechenschmiede LOGIN PASSWORD '${db_password}'"
  runuser --user postgres -- psql -c "ALTER ROLE flaechenschmiede PASSWORD '${db_password}'"
  runuser --user postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='flaechenschmiede'" | grep -q 1 ||
    runuser --user postgres -- createdb --owner=flaechenschmiede \
      --encoding=UTF8 --template=template0 flaechenschmiede
  sed -i \
    -e "s|^APP_SECRET_KEY=.*|APP_SECRET_KEY=${secret_key}|" \
    -e "s|^DATABASE_URL=.*|DATABASE_URL=postgresql+psycopg://flaechenschmiede:${db_password}@localhost:5432/flaechenschmiede|" \
    -e "s|^APP_ENV=.*|APP_ENV=production|" \
    -e "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost|" \
    "$FS_ENV_FILE"
else
  log "Vorhandene Konfiguration und Datenbank-Zugangsdaten werden beibehalten."
fi

database_encoding="$(
  runuser --user postgres -- psql -tAc \
    "SELECT pg_encoding_to_char(encoding) FROM pg_database WHERE datname='flaechenschmiede'"
)"
[[ "$database_encoding" == "UTF8" ]] ||
  fail "Datenbank-Encoding ist '${database_encoding:-unbekannt}', benötigt wird UTF8. Siehe setup/setup.md."

log "Installiere Backend und führe Migrationen aus."
run_as_app_user python3 -m venv "${FS_INSTALL_DIR}/.venv"
run_as_app_user "${FS_INSTALL_DIR}/.venv/bin/pip" install "${FS_INSTALL_DIR}/backend"
load_environment
run_as_app_user env PYTHONPATH="${FS_INSTALL_DIR}:${FS_INSTALL_DIR}/backend" \
  "${FS_INSTALL_DIR}/.venv/bin/alembic" -c "${FS_INSTALL_DIR}/backend/alembic.ini" upgrade head

log "Baue Frontend."
run_as_app_user npm --prefix "${FS_INSTALL_DIR}/frontend" install --no-package-lock
run_as_app_user npm --prefix "${FS_INSTALL_DIR}/frontend" run build
install -d -o root -g www-data -m 0755 "$FS_FRONTEND_DIR"
rsync -a --delete "${FS_INSTALL_DIR}/frontend/dist/" "${FS_FRONTEND_DIR}/"
chown -R root:www-data "$FS_FRONTEND_DIR"
chmod -R u=rwX,g=rX,o=rX "$FS_FRONTEND_DIR"

install -o root -g root -m 0644 \
  "${FS_INSTALL_DIR}/deployment/systemd/flaechenschmiede-backend.service" \
  /etc/systemd/system/flaechenschmiede-backend.service
install -o root -g root -m 0644 \
  "${FS_INSTALL_DIR}/deployment/nginx/flaechenschmiede.conf" \
  /etc/nginx/sites-available/flaechenschmiede
ln -sfn /etc/nginx/sites-available/flaechenschmiede /etc/nginx/sites-enabled/flaechenschmiede
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl daemon-reload
systemctl enable --now flaechenschmiede-backend
systemctl enable nginx
systemctl restart nginx

log "LXC-Installation abgeschlossen."
log "Ersten Administrator anlegen:"
log "set -a; source ${FS_ENV_FILE}; set +a"
log "runuser --user ${FS_APP_USER} -- env PYTHONPATH=${FS_INSTALL_DIR}:${FS_INSTALL_DIR}/backend ${FS_INSTALL_DIR}/.venv/bin/python -m app.cli"
print_status_summary "Installation"
