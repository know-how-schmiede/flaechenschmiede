#!/usr/bin/env bash

# Ruft die spätere Backend-CLI zur sicheren Passwortänderung auf.
# Das Passwort wird absichtlich nicht als Kommandozeilenargument verarbeitet.

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

usage() {
  cat <<'EOF'
Aufruf:
  sudo ./setup/reset-admin-password.sh ADMIN_EMAIL

Das neue Passwort wird von der Backend-CLI verdeckt und mit Bestätigung
abgefragt. Passwörter niemals als Kommandozeilenargument angeben.
EOF
}

if [[ $# -ne 1 ]] || [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
  usage
  [[ $# -eq 1 ]] && exit 0
  exit 2
fi

admin_email="$1"
[[ "$admin_email" == *"@"* ]] || fail "Bitte eine gültige Admin-E-Mail angeben."

require_root
require_installation
load_environment

python_bin="${FS_INSTALL_DIR}/.venv/bin/python"
[[ -x "$python_bin" ]] ||
  fail "Python-Umgebung fehlt: ${python_bin}. Die Anwendung ist noch nicht installiert."

if ! run_as_app_user "$python_bin" -c \
  "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('app.cli') else 1)"; then
  fail "Die Admin-CLI app.cli ist in diesem Projektstand noch nicht implementiert."
fi

log "Starte Passwort-Reset für ${admin_email}."
run_as_app_user "$python_bin" -m app.cli reset-admin-password \
  --email "$admin_email"
log "Admin-Passwort wurde aktualisiert."
