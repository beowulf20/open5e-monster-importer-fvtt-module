const path = require('node:path');

const dotenv = require('dotenv');

function loadEnv(cwd = process.cwd()) {
  dotenv.config({ path: path.resolve(cwd, '.env'), quiet: true });
}

module.exports = { loadEnv };
