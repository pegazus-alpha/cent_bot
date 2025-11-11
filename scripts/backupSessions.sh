#!/usr/bin/env bash
# backupSessions.sh
# copie session.json vers backup avec horodatage

DATA_DIR="./data"
SESSION_FILE="${DATA_DIR}/session.json"
BACKUP_DIR="${DATA_DIR}/backups"

mkdir -p "${BACKUP_DIR}"

if [ -f "${SESSION_FILE}" ]; then
  cp "${SESSION_FILE}" "${BACKUP_DIR}/session-$(date +%Y%m%d-%H%M%S).json"
  echo "Backup saved."
else
  echo "No session file found."
fi
