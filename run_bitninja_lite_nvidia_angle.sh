#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

export BITNINJA_FORCE_NVIDIA=1
export __NV_PRIME_RENDER_OFFLOAD=1
export __GLX_VENDOR_LIBRARY_NAME=nvidia
export __VK_LAYER_NV_optimus=NVIDIA_only

ELECTRON_BIN="./node_modules/.bin/electron"
SANDBOX_BIN="./node_modules/electron/dist/chrome-sandbox"
ARGS=("--ignore-gpu-blocklist" "--enable-unsafe-webgpu" "--enable-features=VaapiVideoDecoder" ".")

if [ -x "$ELECTRON_BIN" ]; then
  if [ -e "$SANDBOX_BIN" ] && [ "$(stat -c '%U:%G %a' "$SANDBOX_BIN" 2>/dev/null || true)" != "root:root 4755" ]; then
    echo "Bitninja Mocap Lite: Electron sandbox helper is not root:root 4755; launching dev mode with --no-sandbox."
    exec "$ELECTRON_BIN" --no-sandbox "${ARGS[@]}"
  fi
  exec "$ELECTRON_BIN" "${ARGS[@]}"
fi

echo "ERROR: Electron binary not found at $ELECTRON_BIN"
echo "Try: npm install"
exit 1

