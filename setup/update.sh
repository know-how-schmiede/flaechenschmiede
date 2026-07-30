#!/usr/bin/env bash

# Aktualisiert eine bestehende Git-Installation per Fast-Forward.

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

require_root
require_command git
require_command runuser
require_installation

branch="${FS_GIT_BRANCH:-main}"

current_branch="$(
  run_as_app_user git -C "$FS_INSTALL_DIR" branch --show-current
)"
[[ "$current_branch" == "$branch" ]] ||
  fail "Aktiver Branch ist '${current_branch}', erwartet wurde '${branch}'."

if [[ -n "$(run_as_app_user git -C "$FS_INSTALL_DIR" status --porcelain)" ]]; then
  fail "Die Installation enthält lokale Änderungen. Update aus Sicherheitsgründen abgebrochen."
fi

log "Lade Änderungen für Branch ${branch}."
run_as_app_user git -C "$FS_INSTALL_DIR" fetch --prune origin
run_as_app_user git -C "$FS_INSTALL_DIR" merge --ff-only "origin/${branch}"

log "Aktualisiere Backend-Abhängigkeiten."
run_as_app_user "${FS_INSTALL_DIR}/.venv/bin/python" -m pip install \
  "${FS_INSTALL_DIR}/backend"

if [[ -x "${FS_INSTALL_DIR}/.venv/bin/alembic" ]] &&
  [[ -f "${FS_INSTALL_DIR}/backend/alembic.ini" ]]; then
  load_environment
  run_as_app_user env PYTHONPATH="${FS_INSTALL_DIR}:${FS_INSTALL_DIR}/backend" \
    "${FS_INSTALL_DIR}/.venv/bin/alembic" \
    -c "${FS_INSTALL_DIR}/backend/alembic.ini" upgrade head
else
  log "Alembic noch nicht eingerichtet; Migrationen übersprungen."
fi

if [[ -f "${FS_INSTALL_DIR}/frontend/package.json" ]]; then
  require_command npm
  run_as_app_user npm --prefix "${FS_INSTALL_DIR}/frontend" install --no-package-lock
  run_as_app_user npm --prefix "${FS_INSTALL_DIR}/frontend" run build
else
  log "Frontend-Lockdatei noch nicht vorhanden; Build übersprungen."
fi

restart_service_if_present "$FS_BACKEND_SERVICE"
log "Update abgeschlossen."
