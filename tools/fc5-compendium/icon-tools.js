const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PACK_CONFIG = {
  spells: { sourceDir: 'fc5-spells', packDir: 'fc5-spells', packName: 'fc5spells', type: 'Item' },
  items: { sourceDir: 'fc5-items', packDir: 'fc5-items', packName: 'fc5items', type: 'Item' },
  classes: { sourceDir: 'fc5-classes', packDir: 'fc5-classes', packName: 'fc5classes', type: 'Item' },
  subclasses: { sourceDir: 'fc5-subclasses', packDir: 'fc5-subclasses', packName: 'fc5subclasses', type: 'Item' },
  features: { sourceDir: 'fc5-features', packDir: 'fc5-features', packName: 'fc5features', type: 'Item' }
};

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_ROOT = path.join(REPO_ROOT, 'tmp', 'fc5-pack-sources');
const OVERRIDES_PATH = path.join(__dirname, 'icon-overrides.json');
const ASSET_ROOT = path.join(REPO_ROOT, 'monster-creator', 'assets', 'fc5-icons');
const MODULE_ASSET_ROOT = 'modules/monster-creator/assets/fc5-icons';

const GENERIC_ICON_PATHS = new Set([
  '',
  'icons/svg/book.svg',
  'icons/svg/item-bag.svg',
  'icons/svg/chest.svg',
  'icons/svg/hammer.svg',
  'icons/svg/sword.svg',
  'icons/consumables/potions/potion-tube-corked-red.webp',
  'icons/magic/symbols/question-stone-yellow.webp'
]);

const IMAGE_TYPES = {
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function trimSlugToken(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function readOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return {};
  }
  return safeJsonParse(fs.readFileSync(OVERRIDES_PATH, 'utf8'), {});
}

function writeOverrides(overrides) {
  fs.mkdirSync(path.dirname(OVERRIDES_PATH), { recursive: true });
  fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`);
}

function normalizeIconKeyPart(value = '') {
  return trimSlugToken(String(value || '')) || 'unknown';
}

function documentIconKey(document, packName = '') {
  const fc5 = document?.flags?.['monster-creator']?.fc5 || {};
  const source = fc5.sourceBook || document?.system?.source?.book || '';
  const rules = fc5.rules || document?.system?.source?.rules || '';
  return [
    packName || 'pack',
    document?.type || 'item',
    normalizeIconKeyPart(document?.name || document?._id),
    normalizeIconKeyPart(source),
    normalizeIconKeyPart(rules)
  ].join(':');
}

function isGenericIcon(img = '') {
  return GENERIC_ICON_PATHS.has(String(img || '').trim());
}

function getPackKeyFromDir(sourceDir) {
  return Object.entries(PACK_CONFIG).find(([, config]) => config.sourceDir === sourceDir)?.[0] || '';
}

function readSourceDocuments(sourceRoot = SOURCE_ROOT) {
  if (!fs.existsSync(sourceRoot)) {
    return [];
  }

  const documents = [];
  for (const sourceDir of fs.readdirSync(sourceRoot).sort()) {
    const dirPath = path.join(sourceRoot, sourceDir);
    if (!fs.statSync(dirPath).isDirectory()) continue;
    const packKey = getPackKeyFromDir(sourceDir);
    const packName = PACK_CONFIG[packKey]?.packName || sourceDir;
    for (const filename of fs.readdirSync(dirPath).sort()) {
      if (!filename.endsWith('.json')) continue;
      const filePath = path.join(dirPath, filename);
      const document = safeJsonParse(fs.readFileSync(filePath, 'utf8'), null);
      if (!document) continue;
      documents.push({
        packKey,
        packName,
        sourceDir,
        filename,
        filePath,
        document,
        iconKey: documentIconKey(document, packName)
      });
    }
  }
  return documents;
}

function queueEntry(record, override = null) {
  const fc5 = record.document?.flags?.['monster-creator']?.fc5 || {};
  const source = record.document?.system?.source || {};
  const queueId = `${record.iconKey}:${record.document?._id || record.filename}`;
  return {
    queueId,
    iconKey: record.iconKey,
    id: record.document?._id || '',
    name: record.document?.name || '',
    type: record.document?.type || '',
    packKey: record.packKey,
    packName: record.packName,
    sourceDir: record.sourceDir,
    filename: record.filename,
    img: record.document?.img || '',
    isGeneric: isGenericIcon(record.document?.img),
    override: override || null,
    status: override?.status || (override?.approved ? 'approved' : 'missing'),
    sourceBook: fc5.sourceBook || source.book || '',
    sourcePage: fc5.sourcePage || source.page || '',
    rules: fc5.rules || source.rules || '',
    sourceCategory: fc5.sourceCategory || source.sourceCategory || '',
    detail: fc5.detail || '',
    description: String(record.document?.system?.description?.value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  };
}

function listIconQueue({ sourceRoot = SOURCE_ROOT, pack = '', q = '', status = 'missing' } = {}) {
  const overrides = readOverrides();
  const query = String(q || '').trim().toLowerCase();
  return readSourceDocuments(sourceRoot)
    .map((record) => queueEntry(record, overrides[record.iconKey]))
    .filter((entry) => !pack || entry.packKey === pack || entry.packName === pack)
    .filter((entry) => !query || [
      entry.name,
      entry.type,
      entry.sourceBook,
      entry.detail,
      entry.description
    ].join(' ').toLowerCase().includes(query))
    .filter((entry) => {
      if (status === 'all') return true;
      if (status === 'approved') return entry.status === 'approved' || Boolean(entry.override?.approved);
      if (status === 'skipped') return entry.status === 'skipped';
      return entry.isGeneric && !entry.override?.approved && entry.status !== 'skipped';
    })
    .sort((left, right) => {
      const packCompare = left.packName.localeCompare(right.packName);
      return packCompare || left.name.localeCompare(right.name);
    });
}

function decodeDataUrl(value = '') {
  const match = String(value).match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Expected an image data URL.');
  }
  const mime = match[1].toLowerCase();
  const ext = IMAGE_TYPES[mime];
  if (!ext) {
    throw new Error(`Unsupported image type: ${mime}`);
  }
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is empty or larger than 10 MB.');
  }
  return { buffer, mime, ext };
}

async function downloadImage(url) {
  const parsed = new URL(String(url || ''));
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Image URL must use http or https.');
  }
  const response = await fetch(parsed);
  if (!response.ok) {
    throw new Error(`Image download failed: ${response.status}`);
  }
  const mime = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  const ext = IMAGE_TYPES[mime];
  if (!ext) {
    throw new Error(`Unsupported image type: ${mime || 'unknown'}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is empty or larger than 10 MB.');
  }
  return { buffer, mime, ext };
}

function findQueueEntry({ iconKey = '', queueId = '', sourceRoot = SOURCE_ROOT } = {}) {
  const entry = listIconQueue({ sourceRoot, status: 'all' }).find((item) => {
    if (queueId) return item.queueId === queueId;
    return item.iconKey === iconKey;
  });
  if (!entry) {
    throw new Error(`Unknown icon queue record: ${queueId || iconKey}`);
  }
  return entry;
}

function writeImageAsset({ entry, buffer, ext }) {
  const packSlug = normalizeIconKeyPart(entry.packName || entry.packKey);
  const baseName = normalizeIconKeyPart(`${entry.name}-${entry.id || entry.iconKey}`);
  const hash = crypto.createHash('sha1').update(buffer).digest('hex').slice(0, 10);
  const filename = `${baseName}-${hash}.${ext}`;
  const dirPath = path.join(ASSET_ROOT, packSlug);
  fs.mkdirSync(dirPath, { recursive: true });
  const filePath = path.join(dirPath, filename);
  fs.writeFileSync(filePath, buffer);
  return `${MODULE_ASSET_ROOT}/${packSlug}/${filename}`;
}

async function approveIcon({ iconKey, queueId, image, sourceRoot = SOURCE_ROOT }) {
  const entry = findQueueEntry({ iconKey, queueId, sourceRoot });
  const payload = image?.kind === 'url'
    ? await downloadImage(image.value)
    : decodeDataUrl(image?.value || '');
  const img = writeImageAsset({ entry, buffer: payload.buffer, ext: payload.ext });
  const overrides = readOverrides();
  overrides[entry.iconKey] = {
    img,
    status: 'approved',
    approved: true,
    source: image?.kind === 'url' ? `url:${image.value}` : 'clipboard',
    mime: payload.mime,
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { iconKey: entry.iconKey, queueId: entry.queueId, override: overrides[entry.iconKey] };
}

function skipIcon({ iconKey, queueId, reason = '' }) {
  const entry = findQueueEntry({ iconKey, queueId });
  const overrides = readOverrides();
  overrides[entry.iconKey] = {
    ...(overrides[entry.iconKey] || {}),
    status: 'skipped',
    approved: false,
    reason: String(reason || ''),
    updatedAt: new Date().toISOString()
  };
  writeOverrides(overrides);
  return { iconKey: entry.iconKey, queueId: entry.queueId, override: overrides[entry.iconKey] };
}

function resetIcon({ iconKey }) {
  const overrides = readOverrides();
  delete overrides[iconKey];
  writeOverrides(overrides);
  return { iconKey };
}

function resolveOverrideIcon(document, packName) {
  const override = readOverrides()[documentIconKey(document, packName)];
  return override?.approved && override.img ? override.img : '';
}

module.exports = {
  ASSET_ROOT,
  GENERIC_ICON_PATHS,
  MODULE_ASSET_ROOT,
  OVERRIDES_PATH,
  SOURCE_ROOT,
  approveIcon,
  documentIconKey,
  isGenericIcon,
  listIconQueue,
  readOverrides,
  resetIcon,
  resolveOverrideIcon,
  skipIcon,
  writeOverrides
};
