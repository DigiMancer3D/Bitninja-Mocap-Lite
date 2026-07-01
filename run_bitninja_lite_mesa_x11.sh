#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Stage 5 diagnostic: run on the integrated Mesa GPU path.
# If this has much lower inference times than NVIDIA PRIME, the delay is an Optimus/EGL issue.
export BITNINJA_FORCE_MESA=1
export ELECTRON_OZONE_PLATFORM_HINT=x11
export GDK_BACKEND=x11
export DRI_PRIME=0
unset __NV_PRIME_RENDER_OFFLOAD || true
unset __GLX_VENDOR_LIBRARY_NAME || true
unset __VK_LAYER_NV_optimus || true

ELECTRON_BIN="./node_modules/.bin/electron"
SANDBOX_BIN="./node_modules/electron/dist/chrome-sandbox"
ARGS=(
  "--ozone-platform=x11"
  "--disable-gpu-sandbox"
  "--ignore-gpu-blocklist"
  "."
)

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
