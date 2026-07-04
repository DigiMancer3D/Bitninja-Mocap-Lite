#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

export BITNINJA_FORCE_MESA=1

ELECTRON_BIN="./node_modules/.bin/electron"
SANDBOX_BIN="./node_modules/electron/dist/chrome-sandbox"

if [ -x "$ELECTRON_BIN" ]; then
  if [ -e "$SANDBOX_BIN" ] && [ "$(stat -c '%U:%G %a' "$SANDBOX_BIN" 2>/dev/null || true)" != "root:root 4755" ]; then
    echo "Bitninja Mocap Lite: Electron sandbox helper is not root:root 4755; launching dev mode with --no-sandbox."
    exec "$ELECTRON_BIN" --no-sandbox .
  fi
  exec "$ELECTRON_BIN" .
fi

echo "ERROR: Electron binary not found at $ELECTRON_BIN"
echo "Try: npm install"
exit 1
