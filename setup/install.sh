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
  ca-certificates curl git nginx postgresql python3 python3-venv \
  python3-pip rsync

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

if [[ ! -f "$FS_ENV_FILE" ]]; then
  install -o root -g "$FS_APP_GROUP" -m 0640 \
    "${FS_INSTALL_DIR}/.env.example" "$FS_ENV_FILE"
  log "Konfiguration angelegt: ${FS_ENV_FILE}"
  log "WICHTIG: Geheimnisse und Produktionswerte müssen dort noch angepasst werden."
fi

log "LXC-Grundinstallation abgeschlossen."
log "Backend, Frontend, Nginx und systemd werden aktiviert, sobald deren Implementierung vorliegt."
