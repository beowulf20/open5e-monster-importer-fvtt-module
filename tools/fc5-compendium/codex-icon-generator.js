const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_BASE_IMAGE = path.join(REPO_ROOT, 'assets', 'rpg-icon-base.png');
const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';
const DEFAULT_MODEL = 'gpt-5.5';
const DEFAULT_SIZE = '1024x1024';
const DEFAULT_QUALITY = 'medium';
const DEFAULT_ACTION = 'edit';
const DEFAULT_REASONING_EFFORT = 'none';

const BASE_PROMPT = `Make icon of the following description using the icon border and style as reference. Remove fire effects unless description says so. Context is icon for rpg game. Item description:

<<item_description>>`;

function codexAuthPath() {
  const codexHome = process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), '.codex');
  return path.join(codexHome, 'auth.json');
}

function readCodexChatGptAuth() {
  const authPath = codexAuthPath();
  if (!fs.existsSync(authPath)) {
    throw new Error(`Codex auth not found at ${authPath}. Run "codex login" with ChatGPT auth first.`);
  }

  const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  if (auth.auth_mode !== 'chatgpt') {
    throw new Error(`Expected Codex auth_mode "chatgpt", found "${auth.auth_mode || 'unknown'}".`);
  }

  const accessToken = auth.tokens?.access_token;
  if (!accessToken) {
    throw new Error(`Codex ChatGPT access token missing in ${authPath}. Run "codex login" again.`);
  }

  return {
    authPath,
    accessToken,
    accountId: auth.tokens?.account_id || '',
    expiresAt: jwtExpiresAt(accessToken)
  };
}

function jwtExpiresAt(token) {
  const [, payload] = String(token).split('.');
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
    return decoded.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
}

function imageDataUrl(filePath) {
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function buildPrompt(description) {
  return BASE_PROMPT.replace('<<item_description>>', description);
}

function buildPayload({ prompt, baseImageDataUrl, model, size, quality, action, reasoningEffort }) {
  return {
    model,
    store: false,
    stream: true,
    reasoning: {
      effort: reasoningEffort
    },
    instructions: prompt,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: 'Generate the RPG item icon using the attached reference image.'
          },
          {
            type: 'input_image',
            image_url: baseImageDataUrl
          }
        ]
      }
    ],
    tools: [
      {
        type: 'image_generation',
        size,
        quality,
        output_format: 'png',
        background: 'opaque',
        action
      }
    ],
    tool_choice: { type: 'image_generation' }
  };
}

async function postCodexResponses({ payload, auth, onEvent }) {
  const headers = {
    accept: 'text/event-stream, application/json',
    authorization: `Bearer ${auth.accessToken}`,
    'content-type': 'application/json',
    origin: 'https://chatgpt.com',
    referer: 'https://chatgpt.com/',
    'user-agent': 'open5e-icon-codex-generator/1.0'
  };
  if (auth.accountId) {
    headers['chatgpt-account-id'] = auth.accountId;
  }

  const response = await fetch(CODEX_RESPONSES_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    const body = parseJsonOrRaw(text);
    const message = body?.error?.message || body?.detail || body?.raw || response.statusText;
    const error = new Error(`Codex Responses request failed (${response.status}): ${message}`);
    error.responseBody = body;
    throw error;
  }

  if (payload.stream && response.body) {
    return readEventStream(response.body, onEvent);
  }

  const body = parseJsonOrRaw(await response.text());
  if (onEvent) onEvent({ event: 'response.body', data: body });
  return { events: [{ event: 'response.body', data: body }] };
}

async function readEventStream(body, onEvent) {
  const events = [];
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';
  let eventName = 'message';
  let dataLines = [];

  const flush = () => {
    if (!dataLines.length) return;
    const raw = dataLines.join('\n');
    const data = parseJsonOrRaw(raw);
    const entry = { event: eventName, data };
    events.push(entry);
    if (onEvent) onEvent(entry);
    eventName = 'message';
    dataLines = [];
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
    }

    let lineEnd;
    while ((lineEnd = buffer.search(/\r?\n/)) !== -1) {
      const line = buffer.slice(0, lineEnd);
      buffer = buffer.slice(lineEnd + (buffer[lineEnd] === '\r' && buffer[lineEnd + 1] === '\n' ? 2 : 1));
      if (!line) {
        flush();
      } else if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }

    if (done) break;
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    for (const line of buffer.split(/\r?\n/)) {
      if (!line) {
        flush();
      } else if (line.startsWith('event:')) {
        eventName = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trimStart());
      }
    }
  }
  flush();

  return { events, output: events.map((event) => event.data).filter(Boolean) };
}

function parseJsonOrRaw(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function findImageResult(responseBody) {
  const output = Array.isArray(responseBody?.output)
    ? responseBody.output
    : (responseBody?.events || []).map((event) => event.data).filter(Boolean);
  return output.find((item) => item?.type === 'image_generation_call' && item.result)
    || output.find((item) => item?.type === 'response.image_generation_call.completed' && item?.image_generation_call?.result)
    || output.find((item) => item?.image_generation_call?.result)
    || output.filter((item) => item?.type === 'response.image_generation_call.partial_image' && item.partial_image_b64).at(-1);
}

function imageResultBase64(imageResult) {
  return imageResult?.result
    || imageResult?.image_generation_call?.result
    || imageResult?.partial_image_b64
    || '';
}

async function generateCodexIcon({
  description,
  baseImage = DEFAULT_BASE_IMAGE,
  model = DEFAULT_MODEL,
  size = DEFAULT_SIZE,
  quality = DEFAULT_QUALITY,
  action = DEFAULT_ACTION,
  reasoningEffort = DEFAULT_REASONING_EFFORT,
  onEvent
}) {
  const cleanDescription = String(description || '').trim();
  if (!cleanDescription) {
    throw new Error('Item description is required.');
  }
  if (!fs.existsSync(baseImage)) {
    throw new Error(`Base image not found: ${baseImage}`);
  }

  const auth = readCodexChatGptAuth();
  const prompt = buildPrompt(cleanDescription);
  const payload = buildPayload({
    prompt,
    baseImageDataUrl: imageDataUrl(baseImage),
    model,
    size,
    quality,
    action,
    reasoningEffort
  });
  const body = await postCodexResponses({ payload, auth, onEvent });
  const imageResult = findImageResult(body);
  const imageBase64 = imageResultBase64(imageResult);
  if (!imageBase64) {
    const error = new Error('No image result found in Codex response.');
    error.responseBody = body;
    throw error;
  }

  return {
    imageBase64,
    dataUrl: `data:image/png;base64,${imageBase64}`,
    responseId: body?.id || body?.events?.find((event) => event.data?.response?.id)?.data?.response?.id || null,
    imageCallId: imageResult.id || imageResult.item_id || null,
    action: imageResult.action || action,
    revisedPrompt: imageResult.revised_prompt || null,
    prompt,
    model,
    size,
    quality,
    reasoningEffort
  };
}

module.exports = {
  BASE_PROMPT,
  CODEX_RESPONSES_URL,
  DEFAULT_ACTION,
  DEFAULT_BASE_IMAGE,
  DEFAULT_MODEL,
  DEFAULT_QUALITY,
  DEFAULT_REASONING_EFFORT,
  DEFAULT_SIZE,
  buildPayload,
  buildPrompt,
  findImageResult,
  generateCodexIcon,
  imageResultBase64,
  readCodexChatGptAuth
};
