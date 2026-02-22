#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODULE_DIR="$SCRIPT_DIR/monster-creator"
DIST_DIR="${SCRIPT_DIR}/dist"
OUTPUT_NAME="monster-creator-v"
DIST_MODULE_DIR="${DIST_DIR}/monster-creator"

BASE_URL="${MONSTER_CREATOR_BASE_URL:-http://127.0.0.1:8000}"
OPEN5E_API_URL="${MONSTER_CREATOR_API_REMOTE_URL:-https://api.open5e.com}"

if [[ ! -d "$MODULE_DIR" ]]; then
  echo "Error: module directory not found at $MODULE_DIR" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required to read package/module version." >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip command is required." >&2
  exit 1
fi

PACKAGE_JSON="$SCRIPT_DIR/package.json"
VERSION=$(node -p "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).version || ''" "$PACKAGE_JSON")
if [[ -z "$VERSION" || "$VERSION" == "null" ]]; then
  echo "Warning: Could not read version from package.json, falling back to module package file." >&2
  VERSION=$(node -p "JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8')).version || ''" "$MODULE_DIR/module.json")
fi

if [[ -z "$VERSION" || "$VERSION" == "null" ]]; then
  echo "Error: Could not read version from package.json or monster-creator/module.json" >&2
  exit 1
fi

mkdir -p "$DIST_DIR"
rm -rf "$DIST_MODULE_DIR"
OUT_FILE="$DIST_DIR/${OUTPUT_NAME}${VERSION}.zip"
LOCAL_MANIFEST_FILE="$DIST_DIR/module.json"

rm -f "$OUT_FILE"

cp -R "$MODULE_DIR" "$DIST_MODULE_DIR"

MONSTER_CREATOR_SOURCE="$MODULE_DIR/module.json" \
MONSTER_CREATOR_TARGET="$LOCAL_MANIFEST_FILE" \
MONSTER_CREATOR_BASE="$BASE_URL" \
MONSTER_CREATOR_VERSION="$VERSION" \
MONSTER_CREATOR_OUTPUT_NAME="$OUTPUT_NAME" \
MONSTER_CREATOR_DIST_MODULE="$DIST_MODULE_DIR" \
MONSTER_CREATOR_OPEN5E_API_URL="$OPEN5E_API_URL" \
node - <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(process.env.MONSTER_CREATOR_SOURCE || '');
const target = path.resolve(process.env.MONSTER_CREATOR_TARGET || '');
const distModule = path.resolve(process.env.MONSTER_CREATOR_DIST_MODULE || '');
const baseUrl = process.env.MONSTER_CREATOR_BASE || '';
const version = process.env.MONSTER_CREATOR_VERSION || '';
const outputName = process.env.MONSTER_CREATOR_OUTPUT_NAME || '';
const open5eApiUrl = String(process.env.MONSTER_CREATOR_OPEN5E_API_URL || '').trim() || 'https://api.open5e.com';

const manifest = JSON.parse(fs.readFileSync(source, 'utf8'));
manifest.version = version;
manifest.manifest = `${baseUrl}/module.json`;
manifest.download = `${baseUrl}/${outputName}${version}.zip`;

fs.writeFileSync(target, JSON.stringify(manifest, null, 2));

if (!distModule) {
  throw new Error('MONSTER_CREATOR_DIST_MODULE is required.');
}

const monsterCreatorScriptPath = path.join(distModule, 'scripts', 'monster-creator.js');
const monsterCreatorScript = fs.readFileSync(monsterCreatorScriptPath, 'utf8');
if (!monsterCreatorScript.includes('globalThis.MONSTER_CREATOR_OPEN5E_API_URL =')) {
  const injectedScript = `globalThis.MONSTER_CREATOR_OPEN5E_API_URL = ${JSON.stringify(open5eApiUrl)};\n${monsterCreatorScript}`;
  fs.writeFileSync(monsterCreatorScriptPath, injectedScript);
}
NODE

cp "$LOCAL_MANIFEST_FILE" "$DIST_MODULE_DIR/module.json"

(
  cd "$DIST_MODULE_DIR"
  zip -r "$OUT_FILE" .
)

echo "Built: $OUT_FILE"
echo "Manifest: $LOCAL_MANIFEST_FILE"
echo "API URL: $OPEN5E_API_URL"
echo "Local install URL: ${BASE_URL}/module.json"
echo "Tip: run: cd \"$DIST_DIR\" && python3 -m http.server 8000"
