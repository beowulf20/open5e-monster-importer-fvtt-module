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
const userDataDir = process.env.CHROME_DEBUG_USER_DATA_DIR
  || path.join('/tmp', 'chrome-foundry-debug');

const args = [
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${userDataDir}`,
  '--no-first-run',
  vttUrl
];

console.log(`Launching ${chrome} with DevTools on port ${debugPort}`);
console.log(`Opening ${vttUrl}`);

const child = spawn(chrome, args, {
  detached: true,
  stdio: 'ignore'
});

child.unref();
