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
readonly FS_FRONTEND_DIR="${FS_FRONTEND_DIR:-/var/www/flaechenschmiede}"
readonly FS_BACKEND_SERVICE="${FS_BACKEND_SERVICE:-flaechenschmiede-backend.service}"
readonly FS_PUBLIC_PORT="${FS_PUBLIC_PORT:-80}"
readonly FS_BACKEND_PORT="${FS_BACKEND_PORT:-8000}"

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

service_status() {
  local service_name="$1"
  local status_text
  status_text="$(systemctl is-active "$service_name" 2>/dev/null || true)"
  printf '%s' "${status_text:-nicht installiert}"
}

print_status_summary() {
  local operation="${1:-Abschluss}"
  local server_ip hostname_text timestamp version branch commit
  local backend_status nginx_status postgres_status health_url health_response health_status
  local public_url

  timestamp="$(date '+%Y-%m-%d %H:%M:%S %Z')"
  hostname_text="$(hostname 2>/dev/null || printf 'unbekannt')"
  server_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  server_ip="${server_ip:-127.0.0.1}"
  version="$(
    awk -F'"' '/^__version__/ {print $2; exit}' \
      "${FS_INSTALL_DIR}/version.py" 2>/dev/null || true
  )"
  version="${version:-unbekannt}"
  branch="$(
    run_as_app_user git -C "$FS_INSTALL_DIR" branch --show-current 2>/dev/null ||
      true
  )"
  commit="$(
    run_as_app_user git -C "$FS_INSTALL_DIR" rev-parse --short HEAD 2>/dev/null ||
      true
  )"
  branch="${branch:-unbekannt}"
  commit="${commit:-unbekannt}"

  backend_status="$(service_status "$FS_BACKEND_SERVICE")"
  nginx_status="$(service_status nginx.service)"
  postgres_status="$(service_status postgresql.service)"
  public_url="http://${server_ip}"
  if [[ "$FS_PUBLIC_PORT" != "80" ]]; then
    public_url="${public_url}:${FS_PUBLIC_PORT}"
  fi
  health_url="http://127.0.0.1:${FS_BACKEND_PORT}/api/v1/health"
  health_response="$(
    curl --silent --show-error --fail --max-time 5 "$health_url" 2>/dev/null ||
      true
  )"
  if [[ -n "$health_response" ]]; then
    health_status="erreichbar"
  else
    health_status="nicht erreichbar"
    health_response="-"
  fi

  printf '\n'
  printf '%s\n' '============================================================'
  printf ' FlaechenSchmiede - Abschlussstatus\n'
  printf '%s\n' '============================================================'
  printf ' Vorgang             : %s\n' "$operation"
  printf ' Zeitpunkt           : %s\n' "$timestamp"
  printf ' Hostname             : %s\n' "$hostname_text"
  printf ' Server-IP            : %s\n' "$server_ip"
  printf ' Version              : %s\n' "$version"
  printf ' Git                  : %s @ %s\n' "$branch" "$commit"
  printf '%s\n' '------------------------------------------------------------'
  printf ' Anwendung            : %s\n' "$public_url"
  printf ' HTTP-Port            : %s\n' "$FS_PUBLIC_PORT"
  printf ' Backend intern       : http://127.0.0.1:%s\n' "$FS_BACKEND_PORT"
  printf ' Health-Endpunkt      : %s\n' "${public_url}/api/v1/health"
  printf '%s\n' '------------------------------------------------------------'
  printf ' Backend-Service      : %s\n' "$backend_status"
  printf ' Nginx-Service        : %s\n' "$nginx_status"
  printf ' PostgreSQL-Service   : %s\n' "$postgres_status"
  printf ' Backend-Health       : %s\n' "$health_status"
  printf ' Health-Antwort       : %s\n' "$health_response"
  printf '%s\n' '------------------------------------------------------------'
  printf ' Installation         : %s\n' "$FS_INSTALL_DIR"
  printf ' Frontend             : %s\n' "$FS_FRONTEND_DIR"
  printf ' Konfiguration        : %s\n' "$FS_ENV_FILE"
  printf ' Daten                : %s\n' "$FS_DATA_DIR"
  printf '%s\n' '============================================================'
}
