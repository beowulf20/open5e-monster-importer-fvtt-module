#!/usr/bin/env node

const path = require('node:path');

const {
  PACK_CONFIG,
  compilePackSources,
  generateCompendiumDocuments,
  parseFc5Xml,
  readFc5Xml,
  summarizeDocuments,
  writeJsonDocuments
} = require('./index.js');

function parseArgs(argv) {
  const args = {
    xmlPath: process.env.FC5_XML_PATH || '',
    sourceRoot: path.resolve(process.cwd(), 'tmp', 'fc5-pack-sources'),
    packRoot: path.resolve(process.cwd(), 'monster-creator', 'packs')
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if ((arg === '--xml' || arg === '-x') && next) {
      args.xmlPath = next;
      index += 1;
      continue;
    }
    if (arg === '--source-root' && next) {
      args.sourceRoot = path.resolve(next);
      index += 1;
      continue;
    }
    if (arg === '--pack-root' && next) {
      args.packRoot = path.resolve(next);
      index += 1;
    }
  }

  if (!args.xmlPath) {
    throw new Error('XML path is required. Pass --xml /path/to/Complete_Compendium_2014+2024.xml or set FC5_XML_PATH.');
  }

  args.xmlPath = path.resolve(args.xmlPath);
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const xml = readFc5Xml(args.xmlPath);
  const parsed = parseFc5Xml(xml);
  const documents = generateCompendiumDocuments(parsed);

  for (const [key, config] of Object.entries(PACK_CONFIG)) {
    const outputDir = path.join(args.sourceRoot, config.sourceDir);
    writeJsonDocuments(outputDir, documents[key]);
  }

  await compilePackSources(args.sourceRoot, args.packRoot);

  const summary = summarizeDocuments(documents);
  process.stdout.write(`Generated FC5 compendiums from ${args.xmlPath}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`Source packs: ${args.sourceRoot}\n`);
  process.stdout.write(`Compiled packs: ${args.packRoot}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
