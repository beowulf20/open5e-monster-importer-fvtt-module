#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const {
  CODEX_RESPONSES_URL,
  DEFAULT_ACTION,
  DEFAULT_BASE_IMAGE,
  DEFAULT_MODEL,
  DEFAULT_QUALITY,
  DEFAULT_REASONING_EFFORT,
  DEFAULT_SIZE,
  buildPrompt,
  generateCodexIcon,
  readCodexChatGptAuth
} = require('./codex-icon-generator.js');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUTPUT = path.join(REPO_ROOT, 'tmp', 'codex-icon-experiment.png');

function usage() {
  console.log(`Usage:
  npm run experiment:codex-icon -- --description "Item text" --execute
  node tools/fc5-compendium/experiment-codex-icon-image.js --description-file item.txt --execute

Options:
  --description <text>       Item description to insert into the base prompt.
  --description-file <path>  Read item description from a text file.
  --base-image <path>        Reference image. Default: assets/rpg-icon-base.png
  --output <path>            Output PNG. Default: tmp/codex-icon-experiment.png
  --model <name>             Main Responses model. Default: ${DEFAULT_MODEL}
  --size <size>              Image size. Default: ${DEFAULT_SIZE}
  --quality <value>          Image quality. Default: ${DEFAULT_QUALITY}
  --action <value>           Image tool action. Default: ${DEFAULT_ACTION}
  --reasoning-effort <value> Codex reasoning effort. Default: ${DEFAULT_REASONING_EFFORT}
  --execute                  Send the request. Without this, only validates and prints a dry run.
  --help                     Show this message.

Auth:
  Uses ChatGPT/Codex auth from $CODEX_HOME/auth.json or ~/.codex/auth.json.
  API-key auth is intentionally not supported by this experiment.`);
}

function parseArgs(argv) {
  const options = {
    baseImage: DEFAULT_BASE_IMAGE,
    output: DEFAULT_OUTPUT,
    model: DEFAULT_MODEL,
    size: DEFAULT_SIZE,
    quality: DEFAULT_QUALITY,
    action: DEFAULT_ACTION,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
    execute: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}.`);
      }
      return argv[index];
    };

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--description') {
      options.description = next();
    } else if (arg === '--description-file') {
      options.descriptionFile = next();
    } else if (arg === '--base-image') {
      options.baseImage = path.resolve(next());
    } else if (arg === '--output') {
      options.output = path.resolve(next());
    } else if (arg === '--model') {
      options.model = next();
    } else if (arg === '--size') {
      options.size = next();
    } else if (arg === '--quality') {
      options.quality = next();
    } else if (arg === '--action') {
      options.action = next();
    } else if (arg === '--reasoning-effort') {
      options.reasoningEffort = next();
    } else if (arg === '--execute') {
      options.execute = true;
    } else if (!arg.startsWith('--') && !options.description) {
      options.description = arg;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readDescription(options) {
  if (options.descriptionFile) {
    return fs.readFileSync(path.resolve(options.descriptionFile), 'utf8').trim();
  }
  return String(options.description || '').trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }

  const description = readDescription(options);
  if (!description) {
    throw new Error('Provide --description or --description-file.');
  }

  const auth = readCodexChatGptAuth();
  const prompt = buildPrompt(description);

  if (!options.execute) {
    console.log('Dry run only. Add --execute to send the Codex Responses request.');
    console.log(JSON.stringify({
      endpoint: CODEX_RESPONSES_URL,
      authPath: auth.authPath,
      authMode: 'chatgpt',
      tokenExpiresAt: auth.expiresAt?.toISOString() || null,
      model: options.model,
      imageTool: {
        type: 'image_generation',
        size: options.size,
        quality: options.quality,
        output_format: 'png',
        background: 'opaque',
        action: options.action
      },
      reasoningEffort: options.reasoningEffort,
      baseImage: options.baseImage,
      output: options.output,
      prompt
    }, null, 2));
    return;
  }

  const result = await generateCodexIcon({
    description,
    baseImage: options.baseImage,
    model: options.model,
    size: options.size,
    quality: options.quality,
    action: options.action,
    reasoningEffort: options.reasoningEffort
  });

  fs.mkdirSync(path.dirname(options.output), { recursive: true });
  fs.writeFileSync(options.output, Buffer.from(result.imageBase64, 'base64'));
  console.log(JSON.stringify({
    output: options.output,
    responseId: result.responseId,
    imageCallId: result.imageCallId,
    action: result.action,
    revisedPrompt: result.revisedPrompt
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message || String(error));
  if (error.responseBody) {
    console.error(JSON.stringify(error.responseBody, null, 2));
  }
  process.exitCode = 1;
});
