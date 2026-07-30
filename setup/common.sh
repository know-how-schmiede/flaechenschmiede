#!/usr/bin/env bash

# Gemeinsame Funktionen für die LXC-Verwaltung.
# Diese Datei wird von den ausführbaren Skripten eingebunden.

set -Eeuo pipefail

readonly FS_APP_NAME="flaechenschmiede"
readonly FS_APP_USER="${FS_APP_USER:-flaechenschmiede}"
readonly FS_APP_GROUP="${FS_APP_GROUP:-flaechenschmiede}"
readonly FS_INSTALL_DIR="${FS_INSTALL_DIR:-/opt/flaechenschmiede}"
readonly FS_DATA_DIR="${FS_DATA_DIR:-/var/lib/flaechenschmiede}"
readonly FS_CONFIG_DIR="${FS_CONFIG_DIR:-/etc/flaechenschmiede}"
readonly FS_ENV_FILE="${FS_ENV_FILE:-${FS_CONFIG_DIR}/flaechenschmiede.env}"
readonly FS_BACKEND_SERVICE="${FS_BACKEND_SERVICE:-flaechenschmiede-backend.service}"

log() {
  printf '[%s] %s\n' "$FS_APP_NAME" "$*"
}

fail() {
  printf '[%s] FEHLER: %s\n' "$FS_APP_NAME" "$*" >&2
  exit 1
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Dieses Skript muss mit sudo oder als root ausgeführt werden."
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Benötigter Befehl fehlt: $1"
}

require_installation() {
  [[ -d "${FS_INSTALL_DIR}/.git" ]] ||
    fail "Keine Git-Installation unter ${FS_INSTALL_DIR} gefunden."
}

load_environment() {
  if [[ -f "$FS_ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$FS_ENV_FILE"
    set +a
  else
    fail "Konfigurationsdatei fehlt: ${FS_ENV_FILE}"
  fi
}

run_as_app_user() {
  runuser --user "$FS_APP_USER" -- "$@"
}

restart_service_if_present() {
  local service_name="$1"
  if systemctl list-unit-files "$service_name" --no-legend 2>/dev/null |
    grep -q "^${service_name}"; then
    systemctl restart "$service_name"
    log "Dienst neu gestartet: ${service_name}"
  else
    log "Dienst noch nicht eingerichtet, Neustart übersprungen: ${service_name}"
  fi
}
