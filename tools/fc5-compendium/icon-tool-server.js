const {
  approveIcon,
  listIconQueue,
  resetIcon,
  skipIcon
} = require('./icon-tools.js');
const { generateCodexIcon } = require('./codex-icon-generator.js');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 14 * 1024 * 1024) {
        reject(new Error('Request body is too large.'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Expected JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

function getPathAndSearch(req) {
  return new URL(req.url || '/', 'http://localhost');
}

function findQueueEntry({ queueId = '', iconKey = '' } = {}) {
  const entry = listIconQueue({ status: 'all' }).find((item) => {
    if (queueId) return item.queueId === queueId;
    return item.iconKey === iconKey;
  });
  if (!entry) {
    throw new Error(`Unknown icon queue record: ${queueId || iconKey}`);
  }
  return entry;
}

function buildGenerationDescription(entry) {
  return [
    `Name: ${entry.name || 'Unknown item'}`,
    `Type: ${entry.type || 'unknown'}`,
    entry.sourceBook ? `Source: ${entry.sourceBook}` : '',
    entry.detail ? `Detail: ${entry.detail}` : '',
    '',
    entry.description ? `Description:\n${entry.description}` : 'Description:'
  ].filter((part) => part !== '').join('\n');
}

function sendSse(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  res.flush?.();
}

function fc5IconToolPlugin() {
  return {
    name: 'fc5-icon-tool-api',
    configureServer(server) {
      server.middlewares.use('/api/fc5-icons', async (req, res) => {
        try {
          const url = getPathAndSearch(req);
          if (req.method === 'GET' && url.pathname === '/queue') {
            const allItems = listIconQueue({
              pack: url.searchParams.get('pack') || '',
              q: url.searchParams.get('q') || '',
              status: url.searchParams.get('status') || 'missing'
            });
            const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 250)));
            const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
            const items = allItems.slice(offset, offset + limit);
            sendJson(res, 200, {
              items,
              count: allItems.length,
              limit,
              offset,
              hasNext: offset + limit < allItems.length,
              hasPrevious: offset > 0
            });
            return;
          }

          if (req.method === 'POST' && url.pathname === '/approve') {
            const result = await approveIcon(await readJsonBody(req));
            sendJson(res, 200, result);
            return;
          }

          if (req.method === 'POST' && url.pathname === '/skip') {
            const result = skipIcon(await readJsonBody(req));
            sendJson(res, 200, result);
            return;
          }

          if (req.method === 'POST' && url.pathname === '/reset') {
            const result = resetIcon(await readJsonBody(req));
            sendJson(res, 200, result);
            return;
          }

          if (req.method === 'POST' && url.pathname === '/generate') {
            const requestBody = await readJsonBody(req);
            const entry = findQueueEntry(requestBody);
            res.statusCode = 200;
            res.setHeader('content-type', 'text/event-stream; charset=utf-8');
            res.setHeader('cache-control', 'no-cache, no-transform');
            res.setHeader('connection', 'keep-alive');
            res.setHeader('x-accel-buffering', 'no');
            res.socket?.setNoDelay?.(true);
            res.flushHeaders?.();
            sendSse(res, 'status', { message: `Generating ${entry.name}` });

            try {
              const result = await generateCodexIcon({
                description: requestBody.description || buildGenerationDescription(entry),
                model: requestBody.model,
                size: requestBody.size,
                quality: requestBody.quality,
                action: requestBody.action,
                reasoningEffort: requestBody.reasoningEffort,
                onEvent(event) {
                  const data = event.data || {};
                  if (data.type === 'response.image_generation_call.in_progress') {
                    sendSse(res, 'status', { message: 'Image generation started' });
                  } else if (data.type === 'response.image_generation_call.generating') {
                    sendSse(res, 'status', { message: 'Rendering image' });
                  } else if (data.type === 'response.image_generation_call.partial_image' && data.partial_image_b64) {
                    sendSse(res, 'partial_image', {
                      dataUrl: `data:image/png;base64,${data.partial_image_b64}`,
                      revisedPrompt: data.revised_prompt || ''
                    });
                  } else if (data.type === 'response.completed') {
                    sendSse(res, 'status', { message: 'Generation complete' });
                  }
                }
              });
              sendSse(res, 'done', {
                dataUrl: result.dataUrl,
                responseId: result.responseId,
                imageCallId: result.imageCallId,
                revisedPrompt: result.revisedPrompt
              });
            } catch (error) {
              sendSse(res, 'error', { error: error.message || String(error) });
            } finally {
              res.end();
            }
            return;
          }

          sendJson(res, 404, { error: 'Unknown FC5 icon API route.' });
        } catch (error) {
          sendJson(res, 400, { error: error.message || String(error) });
        }
      });
    }
  };
}

module.exports = { fc5IconToolPlugin };
