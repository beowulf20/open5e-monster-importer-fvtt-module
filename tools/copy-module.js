#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { loadEnv } = require('./load-env.js');

loadEnv();

const repoRoot = path.resolve(__dirname, '..');
const moduleSource = path.join(repoRoot, 'monster-creator');
const target = String(process.env.FOUNDRY_MONSTER_CREATOR_PATH || '').trim();

if (!target) {
  process.stderr.write('FOUNDRY_MONSTER_CREATOR_PATH is required. Set it in .env or export it before running npm run build.\n');
  process.exit(1);
}

const targetPath = path.resolve(target);
try {
  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.mkdirSync(targetPath, { recursive: true });
  fs.cpSync(moduleSource, targetPath, { recursive: true });
} catch (error) {
  if (error && (error.code === 'EACCES' || error.code === 'EPERM')) {
    process.stderr.write(
      `Could not update ${targetPath}: ${error.message}\n` +
      'Close Foundry VTT and any file explorer windows using this module directory, then run npm run build again.\n'
    );
    process.exit(1);
  }

  throw error;
}

const distStylesDir = path.join(repoRoot, 'dist', 'monster-creator', 'styles');
fs.mkdirSync(distStylesDir, { recursive: true });
fs.copyFileSync(
  path.join(moduleSource, 'styles', 'monster-creator.css'),
  path.join(distStylesDir, 'monster-creator.css')
);

process.stdout.write(`Copied module to ${targetPath}\n`);
