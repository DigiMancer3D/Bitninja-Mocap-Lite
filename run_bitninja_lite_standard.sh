#!/usr/bin/env bash
set -euo pipefail

# Bitninja Mocap Lite portable standard launcher
# Works from any user's folder because it resolves the app folder from this script location.

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${BITNINJA_LOG_DIR:-$HOME/logs/3dcp_logs}"
LOG_FILE="${BITNINJA_LOG_FILE:-$LOG_DIR/bitninja.log}"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

echo "============================================================" >> "$LOG_FILE"
echo "Bitninja Mocap Lite standard launch: $(date)" >> "$LOG_FILE"
echo "App dir: $APP_DIR" >> "$LOG_FILE"
echo "============================================================" >> "$LOG_FILE"

# Preferred order for Kubuntu/NVIDIA, then fallbacks.
if [[ -x "./run_bitninja_lite_nvidia_desktopgl.sh" ]]; then
  exec ./run_bitninja_lite_nvidia_desktopgl.sh >> "$LOG_FILE" 2>&1
elif [[ -x "./run_bitninja_lite_nvidia.sh" ]]; then
  exec ./run_bitninja_lite_nvidia.sh >> "$LOG_FILE" 2>&1
elif [[ -x "./run_bitninja_lite_mesa_x11.sh" ]]; then
  exec ./run_bitninja_lite_mesa_x11.sh >> "$LOG_FILE" 2>&1
elif [[ -f "./package.json" ]]; then
  exec npm start >> "$LOG_FILE" 2>&1
else
  echo "ERROR: Could not find a Bitninja launcher or package.json in: $APP_DIR" >> "$LOG_FILE"
  exit 1
fi
