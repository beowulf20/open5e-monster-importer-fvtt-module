#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
  echo "Error: GITHUB_REPOSITORY environment variable is required." >&2
  exit 1
fi

RELEASE_VERSION="${RELEASE_VERSION:-$(node -p "require('./package.json').version")}"
RELEASE_VERSION="${RELEASE_VERSION#v}"
RELEASE_TAG="${RELEASE_TAG:-v${RELEASE_VERSION}}"

MONSTER_CREATOR_BASE_URL="https://github.com/${GITHUB_REPOSITORY}/releases/download/${RELEASE_TAG}"

export RELEASE_VERSION
export RELEASE_TAG
export MONSTER_CREATOR_BASE_URL

MONSTER_CREATOR_VERSION="$RELEASE_VERSION" ./build-monster-creator.sh

node - <<'NODE'
const fs = require('node:fs');

const version = process.env.RELEASE_VERSION || '';
const repo = process.env.GITHUB_REPOSITORY;
const tagName = process.env.RELEASE_TAG || `v${version}`;

const manifestUrl = `https://github.com/${repo}/releases/latest/download/module.json`;
const zipName = `monster-creator.zip`;
const downloadUrl = `https://github.com/${repo}/releases/download/${tagName}/${zipName}`;

for (const file of ['dist/module.json', 'dist/monster-creator/module.json']) {
  if (!fs.existsSync(file)) {
    throw new Error(`Expected file not found: ${file}`);
  }

  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (version) {
    manifest.version = version;
  }
  delete manifest.name;
  manifest.manifest = manifestUrl;
  manifest.download = downloadUrl;
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}
NODE

cp "dist/monster-creator-v${RELEASE_VERSION}.zip" dist/monster-creator.zip
