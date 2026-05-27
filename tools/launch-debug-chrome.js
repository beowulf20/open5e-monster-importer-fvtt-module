const { spawn, spawnSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const chromeCandidates = [
  process.env.CHROME_BIN,
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser'
].filter(Boolean);

function findChrome() {
  for (const candidate of chromeCandidates) {
    const result = spawnSync(candidate, ['--version'], { stdio: 'ignore' });
    if (!result.error && result.status === 0) return candidate;
  }
  return null;
}

const chrome = findChrome();
if (!chrome) {
  console.error('Unable to find Chrome. Set CHROME_BIN=/path/to/google-chrome in .env.');
  process.exit(1);
}

const vttUrl = process.env.VTT_URL || 'http://192.168.68.100:30000';
const debugPort = process.env.CHROME_DEBUG_PORT || '9222';
const debugHost = process.env.CHROME_DEBUG_HOST || '127.0.0.1';
const debugUrlHost = debugHost === '0.0.0.0' ? '127.0.0.1' : debugHost;
const allowOrigins = process.env.CHROME_DEBUG_ALLOW_ORIGINS
  || `http://localhost:${debugPort},http://127.0.0.1:${debugPort}`;
const userDataDir = process.env.CHROME_DEBUG_USER_DATA_DIR
  || path.join('/tmp', 'chrome-foundry-debug');

const args = [
  `--remote-debugging-address=${debugHost}`,
  `--remote-debugging-port=${debugPort}`,
  `--remote-allow-origins=${allowOrigins}`,
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  vttUrl
];

console.log(`Launching ${chrome} with DevTools on ${debugHost}:${debugPort}`);
console.log(`CDP version: http://${debugUrlHost}:${debugPort}/json/version`);
console.log(`CDP targets: http://${debugUrlHost}:${debugPort}/json/list`);
console.log(`Allowed DevTools origins: ${allowOrigins}`);
console.log(`Opening ${vttUrl}`);

const child = spawn(chrome, args, {
  detached: true,
  stdio: 'ignore'
});

child.unref();
