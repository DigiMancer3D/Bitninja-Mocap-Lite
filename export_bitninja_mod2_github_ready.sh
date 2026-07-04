#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

fail() {
  echo "ERROR: $*" >&2
  exit 1
}

[[ -f package.json ]] || fail "package.json not found. Run this from the Bitninja app root."
[[ -f main.js ]] || fail "main.js not found. Run this from the Bitninja app root."

if command -v node >/dev/null 2>&1; then
  VERSION="$(node -e 'try{console.log(require("./package.json").version || "unknown")}catch(e){console.log("unknown")}' 2>/dev/null)"
else
  VERSION="$(grep -m1 '"version"' package.json | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/' || true)"
  VERSION="${VERSION:-unknown}"
fi

SAFE_VERSION="$(printf '%s' "$VERSION" | tr -c 'A-Za-z0-9._-' '_')"
STAMP="$(date +%Y%m%d_%H%M%S)"
EXPORT_ROOT="$APP_DIR/export"
BASE_NAME="BitninjaMocapLite_${SAFE_VERSION}_GITHUB_UPLOAD_${STAMP}"
DEST="$EXPORT_ROOT/$BASE_NAME"

mkdir -p "$EXPORT_ROOT"
rm -rf "$DEST"
mkdir -p "$DEST"

EXCLUDES=(
  "/.git/"
  "/node_modules/"
  "/dev_artifacts/"
  "/export/"
  "/OutApp/"
  "/dist/"
  "/release/"
  "/logs/"
  "/.cache/"
  "/.vscode/"
  "/.idea/"
  "/bitninja_stage*.sh"
  "/collect_bitninja*.sh"
  "/COLLECTION_NOTES.md"
  "/FILES_INCLUDED.txt"
  "/SOURCE_INVENTORY.txt"
  "/NEW UPDATE NEEDED.txt"
  "*.log"
  "*.tmp"
  "*.bak"
  "*.orig"
  "*.rej"
  "*~"
  ".DS_Store"
  "Thumbs.db"
  "__pycache__/"
)

if command -v rsync >/dev/null 2>&1; then
  RSYNC_ARGS=(-a)
  for pat in "${EXCLUDES[@]}"; do
    RSYNC_ARGS+=(--exclude="$pat")
  done
  rsync "${RSYNC_ARGS[@]}" "$APP_DIR/" "$DEST/"
else
  echo "rsync not found; using tar fallback."
  TAR_EXCLUDES=()
  for pat in "${EXCLUDES[@]}"; do
    # tar exclude patterns are less root-aware; keep the important root excludes explicit.
    case "$pat" in
      "/.git/") TAR_EXCLUDES+=(--exclude='./.git') ;;
      "/node_modules/") TAR_EXCLUDES+=(--exclude='./node_modules') ;;
      "/dev_artifacts/") TAR_EXCLUDES+=(--exclude='./dev_artifacts') ;;
      "/export/") TAR_EXCLUDES+=(--exclude='./export') ;;
      "/OutApp/") TAR_EXCLUDES+=(--exclude='./OutApp') ;;
      "/dist/") TAR_EXCLUDES+=(--exclude='./dist') ;;
      "/release/") TAR_EXCLUDES+=(--exclude='./release') ;;
      "/logs/") TAR_EXCLUDES+=(--exclude='./logs') ;;
      "/bitninja_stage*.sh") TAR_EXCLUDES+=(--exclude='./bitninja_stage*.sh') ;;
      "/collect_bitninja*.sh") TAR_EXCLUDES+=(--exclude='./collect_bitninja*.sh') ;;
      "/COLLECTION_NOTES.md") TAR_EXCLUDES+=(--exclude='./COLLECTION_NOTES.md') ;;
      "/FILES_INCLUDED.txt") TAR_EXCLUDES+=(--exclude='./FILES_INCLUDED.txt') ;;
      "/SOURCE_INVENTORY.txt") TAR_EXCLUDES+=(--exclude='./SOURCE_INVENTORY.txt') ;;
      "/NEW UPDATE NEEDED.txt") TAR_EXCLUDES+=(--exclude='./NEW UPDATE NEEDED.txt') ;;
      *) TAR_EXCLUDES+=(--exclude="$pat") ;;
    esac
  done
  tar "${TAR_EXCLUDES[@]}" -cf - . | tar -xf - -C "$DEST"
fi

# Make sure executable run helpers remain executable in the export.
find "$DEST" -maxdepth 1 -type f -name 'run_bitninja_lite*.sh' -exec chmod u+x {} + 2>/dev/null || true

cat > "$DEST/GITHUB_UPLOAD_NOTES.md" <<NOTES
# Bitninja Mocap Lite GitHub Upload Notes

Generated: $(date)
Source: $APP_DIR
Version: $VERSION

Upload the contents of this folder to GitHub.

Do not upload node_modules. Install dependencies with:

\`\`\`bash
npm install
\`\`\`

For a lockfile-exact install:

\`\`\`bash
npm ci
\`\`\`

Run on Kubuntu/source checkout with:

\`\`\`bash
./run_bitninja_lite_standard.sh
\`\`\`

or:

\`\`\`bash
npm start
\`\`\`
NOTES

(
  cd "$DEST"
  find . -type f | sort > FILES_INCLUDED.txt
  if command -v sha256sum >/dev/null 2>&1; then
    find . -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS.txt
  fi
)

LARGE_REPORT="$DEST/LARGE_FILE_CHECK.txt"
{
  echo "# Large file check"
  echo
  echo "Files over 95 MiB may be rejected by normal GitHub uploads:"
  echo
  find "$DEST" -type f -size +95M -printf '%s bytes  %p\n' 2>/dev/null | sort -nr || true
} > "$LARGE_REPORT"

TAR_PATH="$EXPORT_ROOT/$BASE_NAME.tar.gz"
tar -czf "$TAR_PATH" -C "$EXPORT_ROOT" "$BASE_NAME"

ZIP_PATH=""
if command -v zip >/dev/null 2>&1; then
  ZIP_PATH="$EXPORT_ROOT/$BASE_NAME.zip"
  (
    cd "$EXPORT_ROOT"
    zip -qr "$ZIP_PATH" "$BASE_NAME"
  )
fi

echo "Bitninja mod2 GitHub-ready export created."
echo
echo "Folder:"
echo "  $DEST"
echo
echo "Archive:"
echo "  $TAR_PATH"
if [[ -n "$ZIP_PATH" ]]; then
  echo "  $ZIP_PATH"
fi

echo
echo "Size summary:"
du -sh "$DEST" "$TAR_PATH" ${ZIP_PATH:+"$ZIP_PATH"} 2>/dev/null || true

echo
if grep -q 'bytes' "$LARGE_REPORT"; then
  echo "WARNING: One or more files are over 95 MiB. Review:"
  echo "  $LARGE_REPORT"
else
  echo "Large file check: PASS - no files over 95 MiB found."
fi
