#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

SANDBOX_ARGS=()
if [ -f "node_modules/electron/dist/chrome-sandbox" ]; then
  sandbox_info="$(stat -c '%U:%G %a' node_modules/electron/dist/chrome-sandbox 2>/dev/null || true)"
  if [ "$sandbox_info" != "root:root 4755" ]; then
    echo "Bitninja Mocap Lite: Electron sandbox helper is not root:root 4755; using --no-sandbox for dev launch."
    SANDBOX_ARGS+=(--no-sandbox)
  fi
fi

unset __NV_PRIME_RENDER_OFFLOAD || true
unset __GLX_VENDOR_LIBRARY_NAME || true
unset __VK_LAYER_NV_optimus || true
export BITNINJA_FORCE_MESA=1
export GDK_BACKEND=x11
export ELECTRON_OZONE_PLATFORM_HINT=x11

exec npx electron "${SANDBOX_ARGS[@]}" .
