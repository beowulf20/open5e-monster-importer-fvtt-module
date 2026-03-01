import { registerSettings } from './sbi-importer/sbiConfig.js';
import { sbiUtils } from './sbi-importer/sbiUtils.js';
import { sbiParser } from './sbi-importer/sbiParser.js';

const MONSTER_CREATOR_ID = 'monster-creator';
const JHOW_MODE_SETTING = 'jhowMode';
const JHOW_MODE_CLASS = 'monster-creator-jhow-mode';
const JHOW_RAIN_LAYER_CLASS = 'monster-creator-jhow-rain';
const JHOW_CONFETTI_PIECE_CLASS = 'monster-creator-jhow-confetti-piece';
const JHOW_MONSTER_CREATOR_LABEL = 'Create Jhow';
const MONSTER_CREATOR_LABEL = 'Create Monster';
const JHOW_CLICK_CONFETTI_COUNT = 30;
const JHOW_INTERACTION_CONFETTI_COUNT = 12;
const OPEN5E_API_DEFAULT_ROOT = 'https://api.open5e.com';
const OPEN5E_CREATURES_ENDPOINT = '/v2/creatures/';

const normalizeOpen5eApiRoot = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
};

const getOpen5eApiRoot = () => {
  const legacyOverride = normalizeOpen5eApiRoot(globalThis.MONSTER_CREATOR_OPEN5E_API_URL);
  if (legacyOverride) {
    return legacyOverride;
  }

  if (game?.settings?.get) {
    const settingValue = normalizeOpen5eApiRoot(game.settings.get(MONSTER_CREATOR_ID, 'open5eApiUrl'));
    if (settingValue) {
      return settingValue;
    }
  }

  return OPEN5E_API_DEFAULT_ROOT;
};

const isJhowModeEnabled = () => {
  return Boolean(game?.settings?.get?.(MONSTER_CREATOR_ID, JHOW_MODE_SETTING));
};

const getJhowButtonLabel = () => {
  return isJhowModeEnabled() ? JHOW_MONSTER_CREATOR_LABEL : MONSTER_CREATOR_LABEL;
};

const clamp = (value, min, max) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.max(min, Math.min(max, parsed));
};

const makeBloodDragonConfetti = (container, requestedCount = JHOW_INTERACTION_CONFETTI_COUNT) => {
  if (!container || !isJhowModeEnabled()) {
    return;
  }

  const colorPalette = ['#d41d26', '#ff4f4f', '#9e111b', '#f7f7a8', '#ffb347', '#ff6f4b', '#9c00ff', '#4f0000'];
  const pieceCount = Math.max(1, Math.min(Math.floor(requestedCount), 120));
  const rect = container.getBoundingClientRect();
  const containerRect = {
    width: rect.width || 420,
    height: rect.height || 420
  };

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('span');
    piece.className = JHOW_CONFETTI_PIECE_CLASS;

    const size = clamp(Math.random() * 10 + 6, 6, 18);
    const width = clamp(size * (Math.random() > 0.7 ? 0.35 : 1), 4, 14);
    const height = size;
    const left = clamp(Math.random() * containerRect.width, 0, Math.max(0, containerRect.width - width));
    const drift = clamp((Math.random() - 0.5) * 120, -80, 80);
    const duration = clamp(1.2 + Math.random() * 1.8, 1.2, 3.5);
    const delay = clamp(Math.random() * 0.5, 0, 0.5);
    const rotation = clamp(Math.random() * 360, 0, 360);
    const fallAmount = clamp(containerRect.height * (0.9 + Math.random() * 0.6), containerRect.height, containerRect.height * 1.6);
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)] || '#ff4f4f';

    piece.style.left = `${left}px`;
    piece.style.top = `${-height}px`;
    piece.style.width = `${width}px`;
    piece.style.height = `${height}px`;
    piece.style.backgroundColor = color;
    piece.style.setProperty('--mc-jhow-drift-x', `${drift}px`);
    piece.style.setProperty('--mc-jhow-duration', `${duration}s`);
    piece.style.setProperty('--mc-jhow-delay', `${delay}s`);
    piece.style.setProperty('--mc-jhow-rotation', `${rotation}deg`);
    piece.style.setProperty('--mc-jhow-fall-distance', `${fallAmount}px`);
    piece.style.setProperty('--mc-jhow-size', `${size / 6}`);
    piece.style.borderRadius = `${Math.random() > 0.5 ? '999px' : '1px 3px'}`;

    container.appendChild(piece);
    piece.addEventListener('animationend', () => {
      piece.remove();
    }, { once: true });
  }
};

const getJhowRainLayer = (root) => {
  if (!root) {
    return null;
  }
  const existing = root.querySelector(`.${JHOW_RAIN_LAYER_CLASS}`);
  if (existing) {
    return existing;
  }

  const layer = document.createElement('div');
  layer.className = JHOW_RAIN_LAYER_CLASS;
  root.appendChild(layer);
  return layer;
};

const setMonsterCreatorJhowClass = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  root.classList.toggle(JHOW_MODE_CLASS, isJhowModeEnabled());
};

const maybeCreateJhowConfetti = (root, event = null, options = {}) => {
  if (!isJhowModeEnabled()) {
    return;
  }
  const layer = getJhowRainLayer(root);
  if (!layer) {
    return;
  }
  layer.classList.toggle(JHOW_MODE_CLASS, true);
  const requestedCount = Number(options.pieceCount);
  const pieceCount = Number.isFinite(requestedCount) ? requestedCount : JHOW_INTERACTION_CONFETTI_COUNT;
  makeBloodDragonConfetti(layer, pieceCount);
};

const setMonsterCreatorSubmitLabel = (root) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const submitButton = root.querySelector('.monster-creator-submit');
  if (!(submitButton instanceof HTMLButtonElement)) {
    return;
  }
  submitButton.textContent = getJhowButtonLabel();
  submitButton.classList.toggle('monster-creator-jhow-submit', isJhowModeEnabled());
};

const registerMonsterCreatorSettings = () => {
  if (!game?.settings?.register) {
    return;
  }

  game.settings.register(MONSTER_CREATOR_ID, 'open5eApiUrl', {
    name: 'Open5E API URL',
    hint: 'Base URL used for Open5E API requests. Defaults to https://api.open5e.com.',
    scope: 'world',
    config: true,
    type: String,
    default: OPEN5E_API_DEFAULT_ROOT
  });

  game.settings.register(MONSTER_CREATOR_ID, JHOW_MODE_SETTING, {
    name: 'JHOW MODE',
    hint: 'Enable Blood Dragon visual mode. When enabled, interactions in the Monster Creator window trigger confetti rain.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: () => {
      document.querySelectorAll('.monster-creator-form').forEach((form) => {
        if (!(form instanceof HTMLElement)) {
          return;
        }
        setMonsterCreatorJhowClass(form);
        setMonsterCreatorSubmitLabel(form);
        const layer = getJhowRainLayer(form);
        if (layer) {
          layer.classList.toggle(JHOW_MODE_CLASS, isJhowModeEnabled());
        }
      });

      document
        .querySelectorAll('.monster-creator-button')
        .forEach((node) => {
          node.classList.toggle('monster-creator-jhow-button', isJhowModeEnabled());
          if (node instanceof HTMLButtonElement) {
            node.textContent = getJhowButtonLabel();
          }
        });
    }
  });
};

const getFormatter = () => {
  const formatter = globalThis?.MonsterCreatorStatblockFormatter;
  if (
    !formatter ||
    (typeof formatter.buildMonsterActorPayload !== 'function' && typeof formatter.toWotcStatblockText !== 'function')
  ) {
    return null;
  }
  return formatter;
};

const safeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === 'object' && value !== null) {
    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      return safeNumber(value.value, fallback);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'number')) {
      return safeNumber(value.number, fallback);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'distance')) {
      return safeNumber(value.distance, fallback);
    }
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return fallback;
    }

    const fractionMatch = text.match(/^\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))\s*\/\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))/);
    if (fractionMatch) {
      const left = fractionMatch[1];
      const right = fractionMatch[2];
      const parsedLeft = Number(left.trim());
      const parsedRight = Number(right.trim());
      if (Number.isFinite(parsedLeft) && Number.isFinite(parsedRight) && parsedRight !== 0) {
        return parsedLeft / parsedRight;
      }
    }

    const parsed = Number(text.replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === 'object' && value !== null && Object.prototype.hasOwnProperty.call(value, 'value')) {
    return safeNumber(value.value, fallback);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeInt = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : fallback;
};

const safeString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      return safeString(value.value, fallback);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'name')) {
      return safeString(value.name, fallback);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'text')) {
      return safeString(value.text, fallback);
    }
    if (Object.prototype.hasOwnProperty.call(value, 'desc')) {
      return safeString(value.desc, fallback);
    }
  }

  const text = String(value);
  return text.trim() === '' ? fallback : text.trim();
};

const fetchJson = async (url) => {
  if (foundry?.utils?.fetchJson) {
    return foundry.utils.fetchJson(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open5E request failed: ${response.status}`);
  }
  return response.json();
};

const buildOpen5ePayloadUrl = ({ query, mode, page, limit, type, size, source }) => {
  const params = new URLSearchParams();
  const safeQuery = safeString(query);
  const normalizedMode = safeString(mode, 'name').toLowerCase();

  if (safeQuery) {
    if (normalizedMode === 'name') {
      params.set('name__icontains', safeQuery);
    } else {
      params.set('search', safeQuery);
    }
  }

  if (safeString(type)) {
    params.set('type', safeString(type));
  }
  if (safeString(size)) {
    params.set('size', safeString(size));
  }
  if (safeString(source)) {
    params.set('document__key', safeString(source));
  }

  params.set('limit', String(safeInt(limit, 10)));
  if (page) params.set('page', String(safeInt(page, 1)));

  return `${getOpen5eApiRoot()}${OPEN5E_CREATURES_ENDPOINT}?${params.toString()}`;
};

const setMonsterCreatorActorMetadata = async (actor, { notes = '', source = '' } = {}) => {
  if (!actor || typeof actor.update !== 'function') {
    return;
  }

  try {
    await actor.update({
      flags: {
        [MONSTER_CREATOR_ID]: {
          notes: safeString(notes, ''),
          source
        }
      }
    });
  } catch (error) {
    sbiUtils.warn('[MonsterCreator] Could not persist notes to imported actor', error);
  }
};

const parseMonsterStatblock = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) {
    return null;
  }

  if (!sbiParser || typeof sbiParser.parseInput !== 'function') {
    sbiUtils.warn('[MonsterCreator] SBI parser not available.');
    return null;
  }

  try {
    return sbiParser.parseInput(text);
  } catch (error) {
    sbiUtils.error('[MonsterCreator] Failed to parse SBI statblock text', error);
    return null;
  }
};

const parseNumericString = (value, fallback = NaN) => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'object') {
    const nested = value?.value ?? value?.number ?? value?.distance;
    if (nested !== undefined) {
      return parseNumericString(nested, fallback);
    }
  }

  const text = safeString(value, '');
  if (!text) {
    return fallback;
  }

  const numericMatch = text.match(/[-+]?\d*\.?\d+/);
  return numericMatch ? Number(numericMatch[0]) : fallback;
};

const parseChallengeRating = (value, fallback = NaN) => {
  const raw = safeString(value, '').replace(/,/g, '');
  if (!raw) return fallback;
  if (raw === '½') return 0.5;
  if (raw.includes('/')) {
    const [left, right] = raw.split('/').map((part) => parseFloat(part));
    if (Number.isFinite(left) && Number.isFinite(right) && right !== 0) {
      return left / right;
    }
    return fallback;
  }

  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeParsedSbiActor = (actorSource = null) => {
  if (!actorSource || typeof actorSource !== 'object') {
    return;
  }

  if (Array.isArray(actorSource.speeds)) {
    const normalizedSpeeds = actorSource.speeds
      .map((entry) => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }

        const name = safeString(entry.name, '').toLowerCase().replace(/[^a-z]/g, '').trim();
        const value = parseNumericString(entry.value, NaN);
        if (!Number.isFinite(value) || value < 0) {
          return null;
        }

        return { ...entry, name, value };
      })
      .filter(Boolean);

    const hasWalk = normalizedSpeeds.some((entry) => entry.name === 'walk');
    if (!hasWalk) {
      const unlabeledSpeedIndex = normalizedSpeeds.findIndex((entry) => entry.name === '');
      if (unlabeledSpeedIndex >= 0) {
        normalizedSpeeds[unlabeledSpeedIndex] = { ...normalizedSpeeds[unlabeledSpeedIndex], name: 'walk' };
      }
    }

    actorSource.speeds = normalizedSpeeds;
  }

  if (actorSource.challenge && typeof actorSource.challenge === 'object') {
    const normalizedCr = parseChallengeRating(actorSource.challenge.cr, NaN);
    if (Number.isFinite(normalizedCr)) {
      actorSource.challenge.cr = normalizedCr;
    }

    const normalizedPb = parseNumericString(actorSource.challenge.pb, NaN);
    if (Number.isFinite(normalizedPb)) {
      actorSource.challenge.pb = normalizedPb;
    }

    const normalizedXp = parseNumericString(actorSource.challenge.xp, NaN);
    if (Number.isFinite(normalizedXp)) {
      actorSource.challenge.xp = normalizedXp;
    }
  }
};

const createMonsterFromText = async (rawText, { notes = '', folderId, source = 'manual-statblock' } = {}) => {
  const parserResult = parseMonsterStatblock(rawText);
  if (!parserResult) {
    sbiUtils.warn('[MonsterCreator] No SBI parse result for provided text.');
    return null;
  }

  sbiUtils.log('[MonsterCreator] SBI parse path selected for statblock text', {
    hasCreateActor5e: typeof parserResult?.actor?.createActor5e === 'function'
  });
  return createMonsterFromParsedResult(parserResult, { notes: safeString(notes, ''), source, folderId });
};

const createMonsterFromParsedResult = async (parserResult, { notes = '', source = 'manual-statblock', folderId } = {}) => {
  const actorSource = parserResult?.actor || parserResult;
  if (!actorSource) {
    return null;
  }

  if (typeof actorSource.createActor5e !== 'function') {
    sbiUtils.warn('[MonsterCreator] Parsed result does not expose createActor5e.');
    return null;
  }

  try {
    sanitizeParsedSbiActor(actorSource);
    const result = await actorSource.createActor5e(folderId);
    const actor = result?.actor5e || result?.actor || result;
    if (!actor) {
      sbiUtils.warn('[MonsterCreator] Parsed actor import returned no actor', {
        hasImportIssues: Boolean(result?.importIssues),
        importIssues: result?.importIssues || null,
        name: actorSource?.name
      });
      return null;
    }

    await setMonsterCreatorActorMetadata(actor, { notes, source });
    sbiUtils.log(`Created ${actor.name}`);
    actor.sheet?.render(true);

    return actor;
  } catch (error) {
    sbiUtils.error('[MonsterCreator] Parsed actor import failed', error);
    return null;
  }
};

const normalizeOpen5eLookupInput = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('http://') || trimmed.includes('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (!parsed.pathname) return null;
      const match = parsed.pathname.match(/\/v2\/creatures\/(?<slug>[^/?#]+)/i);
      if (match?.groups?.slug) {
        return {
          sourceType: 'url',
          slug: decodeURIComponent(match.groups.slug),
          url: `${getOpen5eApiRoot()}${OPEN5E_CREATURES_ENDPOINT}${match.groups.slug}/`
        };
      }
    } catch (error) {
      sbiUtils.warn('[MonsterCreator] URL parse failed for Open5E input', {
        value: trimmed,
        error: String(error)
      });
    }
    return null;
  }

  const slashTrimmed = trimmed.replace(/^\/+|\/+$/g, '');
  const isCreaturePath = /^v2\/creatures\/(?<slug>[^/?#]+)/i.test(slashTrimmed);
  if (isCreaturePath) {
    const slugMatch = slashTrimmed.match(/^v2\/creatures\/(?<slug>[^/?#]+)/i);
    const slug = slugMatch?.groups?.slug;
    return {
      sourceType: 'slug',
      slug,
      url: `${getOpen5eApiRoot()}/v2/creatures/${encodeURIComponent(slug)}/`
    };
  }

  if (/^\w(?:[ \w-]*)$/i.test(trimmed) && !trimmed.includes(' ')) {
    return {
      sourceType: 'slug',
      slug: trimmed.toLowerCase(),
      url: `${getOpen5eApiRoot()}${OPEN5E_CREATURES_ENDPOINT}${encodeURIComponent(trimmed.toLowerCase())}/`
    };
  }

  return {
    sourceType: 'query',
    query: trimmed
  };
};

const resolveOpen5eMonster = async (input, options = {}) => {
  if (input && typeof input === 'object') {
    if (
      typeof input.url === 'string' &&
      (input.url.includes('open5e.com') || input.url.startsWith(getOpen5eApiRoot()))
    ) {
      const normalized = normalizeOpen5eLookupInput(input.url);
      if (normalized?.url) {
        return await fetchJson(normalized.url);
      }
    }

    if (typeof input.slug === 'string') {
      return input;
    }

    if (typeof input.name === 'string') {
      return input;
    }

    return null;
  }

  const normalized = normalizeOpen5eLookupInput(input);
  if (!normalized) {
    return null;
  }

  if (normalized.sourceType === 'url' || normalized.sourceType === 'slug') {
    try {
      const monsterData = await fetchJson(normalized.url);
      return monsterData;
    } catch (error) {
      sbiUtils.error('[MonsterCreator] Open5E creature fetch failed', { slug: normalized.slug, error: String(error) });
      console.error('[MonsterCreator] Open5E creature fetch failed', { slug: normalized.slug, error: String(error) });
      return null;
    }
  }

  const payload = await fetchJson(buildOpen5ePayloadUrl({
    query: normalized.query,
    mode: safeString(options.mode, 'name'),
    page: safeInt(options.page, 1),
    limit: safeInt(options.limit, 100),
    type: safeString(options.type),
    size: safeString(options.size),
    source: safeString(options.source)
  }));

  const results = Array.isArray(payload?.results) ? payload.results : [];
  if (results.length > 0) {
    return results[0];
  }

  return null;
};

const createMonsterFromOpen5eData = async (monsterData, { notes = '', folderId } = {}) => {
  const formatter = getFormatter();
  if (!formatter || typeof formatter.toWotcStatblockText !== 'function') {
    sbiUtils.warn('[MonsterCreator] Open5E formatter unavailable; cannot build parser input text.');
    return null;
  }

  const open5eStatblockText = (() => {
    if (typeof formatter.toWotcStatblockText !== 'function') {
      return null;
    }

    try {
      return formatter.toWotcStatblockText(monsterData);
    } catch (error) {
      sbiUtils.warn('[MonsterCreator] Failed to build Open5E statblock text for SBI import path', {
        name: monsterData?.name || '',
        error: String(error)
      });
      return null;
    }
  })();

  if (open5eStatblockText) {
    const actor = await createMonsterFromText(open5eStatblockText, {
      notes,
      folderId,
      source: 'open5e-api'
    });

    if (actor) {
      return actor;
    }
  }

  sbiUtils.error('[MonsterCreator] Open5E import failed after SBI parse path.', {
    name: safeString(monsterData?.name, '')
  });

  return null;
};

const createMonsterFromOpen5e = async (monsterOrText, options = {}) => {
  const monsterData = await resolveOpen5eMonster(monsterOrText, options);
  if (!monsterData) {
    return null;
  }

  return createMonsterFromOpen5eData(monsterData, options);
};

const buildManualMonsterPayload = (formData = {}) => {
  const rawChallenge = parseChallengeRating(formData.challenge, 0);
  const challenge = Number.isFinite(rawChallenge) ? rawChallenge : 0;
  const speed = safeInt(formData.speed, 30);
  const normalizedSize = (() => {
    const rawSize = safeString(formData.size, 'med').toLowerCase();
    const aliases = {
      tiny: 'tiny',
      small: 'sm',
      medium: 'med',
      large: 'lg',
      huge: 'huge',
      gargantuan: 'grg',
      sm: 'sm',
      med: 'med',
      lg: 'lg',
      grg: 'grg'
    };

    return aliases[rawSize] || 'med';
  })();

  return {
    name: safeString(formData.name, 'New Monster'),
    img: safeString(formData.img, 'icons/svg/mystery-man.svg'),
    type: safeString(formData.type, 'humanoid'),
    size: normalizedSize,
    alignment: safeString(formData.alignment, 'unaligned'),
    ac: safeNumber(formData.ac, 10),
    hp: safeInt(formData.hp, 10),
    speed: {
      walk: speed
    },
    challenge_rating_decimal: challenge,
    challenge_rating_text: String(challenge),
    ability_scores: {
      strength: safeInt(formData.str, 10),
      dexterity: safeInt(formData.dex, 10),
      constitution: safeInt(formData.con, 10),
      intelligence: safeInt(formData.int, 10),
      wisdom: safeInt(formData.wis, 10),
      charisma: safeInt(formData.cha, 10)
    },
    desc: safeString(formData.notes, ''),
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendaryActions: [],
    mythicActions: [],
    lairActions: [],
    document: {
      display_name: 'Manual Entry',
      name: 'Manual Entry',
      key: 'manual-statblock',
      type: 'SOURCE'
    }
  };
};

const createMonsterFromManualForm = async (formData = {}, { notes = '', folderId } = {}) => {
  const formatter = getFormatter();
  if (
    !formatter
    || typeof formatter.buildMonsterActorPayload !== 'function'
    || typeof formatter.toWotcStatblockText !== 'function'
  ) {
    sbiUtils.warn('[MonsterCreator] Manual creation unavailable: formatter helper missing.');
    return null;
  }

  if (typeof parseMonsterStatblock !== 'function') {
    sbiUtils.warn('[MonsterCreator] Manual creation unavailable: parser missing.');
    return null;
  }

  try {
    const actorPayload = formatter.buildMonsterActorPayload(buildManualMonsterPayload(formData));
    const statblockText = formatter.toWotcStatblockText(actorPayload);
    if (!statblockText) {
      sbiUtils.warn('[MonsterCreator] Manual creation unavailable: failed to render fallback statblock text.');
      return null;
    }

    const parserResult = parseMonsterStatblock(statblockText);
    if (!parserResult) {
      sbiUtils.warn('[MonsterCreator] Manual creation parse step failed.');
      return null;
    }

    return createMonsterFromParsedResult(parserResult, {
      notes: safeString(notes, ''),
      folderId,
      source: 'manual'
    });
  } catch (error) {
    sbiUtils.error('[MonsterCreator] Manual actor creation failed', error);
    return null;
  }
};

const searchOpen5e = async (query, options = {}) => {
  return fetchJson(buildOpen5ePayloadUrl({
    query,
    mode: safeString(options.mode, 'name'),
    page: safeInt(options.page, 1),
    limit: safeInt(options.limit, 100),
    type: safeString(options.type),
    size: safeString(options.size),
    source: safeString(options.source)
  }));
};

class MonsterCreatorForm extends FormApplication {
  constructor(options = {}) {
    super(options);

    this._formatter = getFormatter();
    this._open5eResults = [];
    this._open5eSelectedIndex = -1;
    this._open5ePage = 1;
    this._open5eCount = 0;
    this._open5eNext = null;
    this._open5ePrevious = null;

    this._elements = {};
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: `${MONSTER_CREATOR_ID}-form`,
      template: `modules/${MONSTER_CREATOR_ID}/templates/monster-creator-form.hbs`,
      title: 'Monster Creator',
      width: 560,
      height: 700,
      closeOnSubmit: true,
      submitOnChange: false,
      submitOnClose: false,
      resizable: true
    });
  }

  get _root() {
    return this.element?.length ? this.element[0] : this.element;
  }

  _readOpen5eInputs() {
    const root = this._root;
    if (!root) {
      return {
        query: '',
        mode: 'name',
        page: 1,
        limit: 100,
        type: '',
        size: '',
        source: ''
      };
    }

    const value = (selector) => root.querySelector(selector)?.value || '';

    return {
      query: value('[name="open5eQuery"]'),
      mode: 'name',
      page: safeInt(value('[name="open5ePage"]') || this._open5ePage || 1, 1),
      limit: safeInt(value('[name="open5eLimit"]') || 100, 100),
      type: value('[name="open5eType"]'),
      size: value('[name="open5eSize"]'),
      source: value('[name="open5eSource"]')
    };
  }

  _updateOpen5eControls(resultsPayload) {
    const root = this._root;
    if (!root) return;

    const count = Number(resultsPayload?.count || 0);
    const page = Number(resultsPayload?.page || this._open5ePage || 1);
    const resultsLength = Array.isArray(resultsPayload?.results) ? resultsPayload.results.length : 0;
    const next = Boolean(this._open5eNext);
    const previous = Boolean(this._open5ePrevious);

    if (this._elements.pageInput) {
      this._elements.pageInput.value = String(page);
    }
    if (this._elements.statusEl) {
      this._elements.statusEl.textContent = `count=${count} · page=${page} · results=${resultsLength} · prev=${previous ? 'yes' : 'no'} · next=${next ? 'yes' : 'no'}`;
    }
    if (this._elements.prevBtn) this._elements.prevBtn.disabled = !previous;
    if (this._elements.nextBtn) this._elements.nextBtn.disabled = !next;
  }

  _mapOpen5eSizeToFormValue(size) {
    const map = {
      tiny: 'tiny',
      small: 'sm',
      medium: 'med',
      large: 'lg',
      huge: 'huge',
      gargantuan: 'grg'
    };

    return map[safeString(size).toLowerCase()] || 'med';
  }

  _safeWalkSpeed(monster) {
    const speed = monster?.speed_all || monster?.speed || {};
    const walk = speed?.walk;
    const parsedWalk = safeNumber(walk, NaN);
    if (Number.isFinite(parsedWalk)) {
      return parsedWalk;
    }

    const parsedSpeedValue = safeNumber(speed?.value, NaN);
    if (Number.isFinite(parsedSpeedValue) && (safeString(speed?.unit, '') === '' || safeString(speed?.unit).toLowerCase() === 'feet')) {
      return parsedSpeedValue;
    }

    return 30;
  }

  _prefillManualFromOpen5e(monster) {
    if (!monster || !this._root) return;
    const root = this._root;
    const normalized = this._formatter?.normalizeOpen5eMonster
      ? this._formatter.normalizeOpen5eMonster(monster)
      : null;
    const normalizedMonster = normalized || {};

    const nameInput = root.querySelector('[name="name"]');
    const imgInput = root.querySelector('[name="img"]');
    const typeInput = root.querySelector('[name="type"]');
    const sizeInput = root.querySelector('[name="size"]');
    const alignmentInput = root.querySelector('[name="alignment"]');
    const acInput = root.querySelector('[name="ac"]');
    const hpInput = root.querySelector('[name="hp"]');
    const speedInput = root.querySelector('[name="speed"]');
    const challengeInput = root.querySelector('[name="challenge"]');
    const strInput = root.querySelector('[name="str"]');
    const dexInput = root.querySelector('[name="dex"]');
    const conInput = root.querySelector('[name="con"]');
    const intInput = root.querySelector('[name="int"]');
    const wisInput = root.querySelector('[name="wis"]');
    const chaInput = root.querySelector('[name="cha"]');
    const notesInput = root.querySelector('[name="notes"]');

    if (nameInput) nameInput.value = safeString(monster.name, nameInput.value);
    if (imgInput) imgInput.value = safeString(monster.illustration, imgInput.value);
    if (typeInput) typeInput.value = safeString(monster.type?.name || normalizedMonster.type || monster.type, typeInput.value);
    if (sizeInput) sizeInput.value = this._mapOpen5eSizeToFormValue(monster.size?.name || normalizedMonster.size || monster.size);
    if (alignmentInput) alignmentInput.value = safeString(monster.alignment || normalizedMonster.alignment || alignmentInput.value);
    if (acInput) acInput.value = String(safeNumber(monster.armor_class ?? normalizedMonster.ac, safeNumber(acInput.value, 10)));
    if (hpInput) hpInput.value = String(safeNumber(monster.hit_points ?? normalizedMonster.hp, safeNumber(hpInput.value, 10)));
    if (speedInput) speedInput.value = String(safeInt(this._safeWalkSpeed(monster), safeInt(speedInput.value, 30)));
    if (challengeInput) challengeInput.value = String(safeNumber(monster.challenge_rating_decimal ?? normalizedMonster.challenge, safeNumber(challengeInput.value, 0)));
    if (strInput) strInput.value = String(safeNumber(monster.ability_scores?.strength ?? normalizedMonster?.abilityScores?.str?.value, safeNumber(strInput.value, 10)));
    if (dexInput) dexInput.value = String(safeNumber(monster.ability_scores?.dexterity ?? normalizedMonster?.abilityScores?.dex?.value, safeNumber(dexInput.value, 10)));
    if (conInput) conInput.value = String(safeNumber(monster.ability_scores?.constitution ?? normalizedMonster?.abilityScores?.con?.value, safeNumber(conInput.value, 10)));
    if (intInput) intInput.value = String(safeNumber(monster.ability_scores?.intelligence ?? normalizedMonster?.abilityScores?.int?.value, safeNumber(intInput.value, 10)));
    if (wisInput) wisInput.value = String(safeNumber(monster.ability_scores?.wisdom ?? normalizedMonster?.abilityScores?.wis?.value, safeNumber(wisInput.value, 10)));
    if (chaInput) chaInput.value = String(safeNumber(monster.ability_scores?.charisma ?? normalizedMonster?.abilityScores?.cha?.value, safeNumber(chaInput.value, 10)));

    if (notesInput) {
      const traitsText = Array.isArray(monster.traits)
        ? monster.traits.map((trait) => `${trait.name || 'Trait'}: ${safeString(trait.desc)}`).join('\n')
        : '';
      const actionText = Array.isArray(monster.actions)
        ? monster.actions.map((action) => `${action.name || 'Action'}: ${safeString(action.desc)}`).join('\n')
        : '';
      notesInput.value = [safeString(monster.desc), traitsText, actionText].filter(Boolean).join('\n\n') || notesInput.value;
    }
  }

  _labelForMonster(monster) {
    const name = safeString(monster?.name || monster?.slug, 'Unknown');
    const type = safeString(monster?.type?.name || monster?.type, '');
    const size = safeString(monster?.size?.name || monster?.size, '');
    const source = safeString(monster?.document?.name || monster?.source, '');
    const detail = [size, type].filter(Boolean).join(' ') || 'Creature';
    return `${name} · ${detail}${source ? ` · ${source}` : ''}`;
  }

  _renderOpen5eResults() {
    const container = this._elements.resultsList;
    if (!container) return;

    container.innerHTML = '';
    if (!this._open5eResults.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No results for this page.';
      container.appendChild(empty);
      return;
    }

    this._open5eResults.forEach((monster, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `monster-creator-open5e-result ${index === this._open5eSelectedIndex ? 'selected' : ''}`;
      button.textContent = `${index + 1}. ${this._labelForMonster(monster)}`;
      button.dataset.index = String(index);
      button.addEventListener('click', () => {
        this._setOpen5eSelection(index);
      });
      container.appendChild(button);
    });
  }

  _setOpen5eSelection(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this._open5eResults.length) {
      this._open5eSelectedIndex = -1;
      this._renderOpen5eResults();
      return;
    }

    this._open5eSelectedIndex = index;
    this._renderOpen5eResults();
    const selected = this._open5eResults[index];
    if (!selected) {
      return;
    }

    this._prefillManualFromOpen5e(selected);

    if (this._elements.statusEl) {
      this._elements.statusEl.textContent = `Selected: ${this._labelForMonster(selected)}`;
    }
  }

  _clearOpen5eSelection() {
    this._open5eSelectedIndex = -1;
    this._elements.statusEl && (this._elements.statusEl.textContent = '');
    this._renderOpen5eResults();
  }

  _parseResultData(payload) {
    return payload && Array.isArray(payload.results) ? payload.results : [];
  }

  async _loadOpen5ePage(page = 1) {
    const root = this._root;
    if (!root) return;

    const queryState = this._readOpen5eInputs();
    const url = buildOpen5ePayloadUrl({
      query: queryState.query,
      mode: queryState.mode,
      page,
      limit: queryState.limit,
      type: queryState.type,
      size: queryState.size,
      source: queryState.source
    });

    this._open5eCount = 0;
    this._open5eNext = null;
    this._open5ePrevious = null;
    this._open5eResults = [];
    this._open5ePage = page;

    try {
      const payload = await fetchJson(url);
      this._open5eCount = Number(payload?.count || 0);
      this._open5eNext = payload?.next || null;
      this._open5ePrevious = payload?.previous || null;
      this._open5eResults = this._parseResultData(payload);
      this._open5eSelectedIndex = this._open5eResults.length ? 0 : -1;

      this._updateOpen5eControls({
        count: this._open5eCount,
        page: this._open5ePage,
        results: this._open5eResults
      });
      this._renderOpen5eResults();
      if (!this._open5eResults.length) {
        sbiUtils.log('No monsters matched this page.');
      }
    } catch (err) {
      sbiUtils.error('Monster Creator: Open5E search failed', err);
      console.error('Monster Creator: Open5E search failed', err);
      if (this._elements.statusEl) {
        this._elements.statusEl.textContent = String(err);
      }
      sbiUtils.error(`Open5E search failed: ${String(err)}`);
      this._open5eResults = [];
      this._open5eSelectedIndex = -1;
      this._renderOpen5eResults();
      this._updateOpen5eControls({ count: 0, page: page, results: [] });
    }
  }

  _goToNextOpen5ePage() {
    if (!this._open5eNext) {
      return;
    }

    this._loadOpen5ePage(this._open5ePage + 1);
  }

  _goToPreviousOpen5ePage() {
    if (!this._open5ePrevious) {
      return;
    }

    this._loadOpen5ePage(Math.max(1, this._open5ePage - 1));
  }

  activateListeners(html) {
    super.activateListeners(html);
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

  setMonsterCreatorJhowClass(root);
  setMonsterCreatorSubmitLabel(root);
  maybeCreateJhowConfetti(root);
  const launchJhowConfetti = (event) => {
      if (!event) return;
      if (event.type === 'submit' || event.type === 'input' || event.type === 'change' || event.isTrusted) {
        const pieceCount = event.type === 'click'
          ? JHOW_CLICK_CONFETTI_COUNT
          : JHOW_INTERACTION_CONFETTI_COUNT;
        maybeCreateJhowConfetti(root, event, { pieceCount });
      }
    };
    root.addEventListener('click', launchJhowConfetti);
    root.addEventListener('change', launchJhowConfetti);
    root.addEventListener('input', launchJhowConfetti);
    root.addEventListener('submit', launchJhowConfetti);

    this._elements = {
      pageInput: root.querySelector('[name="open5ePage"]'),
      queryInput: root.querySelector('[name="open5eQuery"]'),
      statusEl: root.querySelector('.monster-creator-open5e-status'),
      resultsList: root.querySelector('.monster-creator-open5e-results'),
      searchBtn: root.querySelector('.monster-creator-open5e-search'),
      prevBtn: root.querySelector('.monster-creator-open5e-prev'),
      nextBtn: root.querySelector('.monster-creator-open5e-next'),
      clearBtn: root.querySelector('.monster-creator-open5e-clear')
    };

    if (this._elements.searchBtn) {
      this._elements.searchBtn.addEventListener('click', () => {
        this._loadOpen5ePage(1);
      });
    }
    if (this._elements.prevBtn) {
      this._elements.prevBtn.disabled = true;
      this._elements.prevBtn.addEventListener('click', () => {
        this._goToPreviousOpen5ePage();
      });
    }
    if (this._elements.nextBtn) {
      this._elements.nextBtn.disabled = true;
      this._elements.nextBtn.addEventListener('click', () => {
        this._goToNextOpen5ePage();
      });
    }
    if (this._elements.clearBtn) {
      this._elements.clearBtn.addEventListener('click', () => this._clearOpen5eSelection());
    }
    if (this._elements.queryInput) {
      this._elements.queryInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          this._loadOpen5ePage(1);
        }
      });
    }

    this._updateOpen5eControls({
      count: this._open5eCount,
      page: this._open5ePage,
      results: this._open5eResults
    });
    this._renderOpen5eResults();
  }

  getData() {
    return {
      defaults: {
        name: 'New Monster',
        img: 'icons/svg/mystery-man.svg',
        type: 'humanoid',
        size: 'med',
        alignment: 'unaligned',
        hp: 10,
        ac: 10,
        speed: 30,
        challenge: 0,
        notes: '',
        str: 10,
        dex: 10,
        con: 10,
        int: 10,
        wis: 10,
        cha: 10
      }
    };
  }

  async _updateObject(_event, formData) {
    const selectedMonster = this._open5eSelectedIndex >= 0
      ? this._open5eResults[this._open5eSelectedIndex]
      : null;

    sbiUtils.log('[MonsterCreator] Form submit', {
      selectedMonster: selectedMonster?.name || null,
      hasSelection: Boolean(selectedMonster),
      formatterAvailable: Boolean(this._formatter)
    });

    if (!selectedMonster) {
      sbiUtils.log('[MonsterCreator] No Open5E monster selected. Creating from manual form values.');
      const manualActor = await createMonsterFromManualForm(formData, {
        notes: String(formData.notes || ''),
        folderId: undefined
      });

      if (manualActor) {
        return manualActor;
      }

      sbiUtils.error('[MonsterCreator] Failed to create monster from manual form data.');
      return null;
    }

    if (selectedMonster) {
      sbiUtils.log('[MonsterCreator] Selected monster challenge values', {
        name: selectedMonster.name,
        challenge_rating_decimal: selectedMonster.challenge_rating_decimal,
        challenge_rating_text: selectedMonster.challenge_rating_text,
        challenge_rating: selectedMonster.challenge_rating
      });
    }

    const actor = await createMonsterFromOpen5eData(selectedMonster, {
      notes: String(formData.notes || ''),
      folderId: undefined,
      source: 'open5e-api'
    });

    if (actor) {
      return actor;
    }

    sbiUtils.error('[MonsterCreator] Failed to create open5e monster via SBI flow.');
    return null;
  }

}

Hooks.once('init', () => {
  try {
    registerSettings();
    registerMonsterCreatorSettings();
  } catch (error) {
    sbiUtils.warn('[MonsterCreator] registerSettings skipped or deferred:', error);
  }

  const module = game?.modules?.get?.(MONSTER_CREATOR_ID);
  if (module) {
    const parse = (text) => parseMonsterStatblock(text);
    const importMonster = async (text, options = {}) => {
      return await createMonsterFromText(text, options);
    };
    const searchOpen5eApi = async (query, options = {}) => searchOpen5e(query, options);
    const importFromOpen5e = async (query, options = {}) => createMonsterFromOpen5e(query, options);

    module.api = {
      openMonsterCreator: () => new MonsterCreatorForm().render(true),
      open: () => new MonsterCreatorForm().render(true),
      parse,
      import: importMonster,
      parseAndCreate: importMonster,
      searchOpen5e: searchOpen5eApi,
      open5eSearch: searchOpen5eApi,
      importOpen5e: importFromOpen5e,
      importFromOpen5e
    };
  }
});

const addMonsterCreatorButton = (_app, html) => {
  if (!html) return;

  const isHtmlElement = (value) => value && value.nodeType === 1;

  let root = null;
  if (isHtmlElement(html)) {
    root = html;
  } else if (typeof html === 'object' && html !== null && typeof html.jquery === 'string' && html.length) {
    root = html[0];
  } else if (isHtmlElement(html?.[0])) {
    root = html[0];
  }
  if (!root || !(root instanceof HTMLElement)) return;
  if (root.querySelector(`.${MONSTER_CREATOR_ID}-button`)) return;

  const user = game?.user;
  const canCreateActor = (() => {
    if (!user) {
      return true;
    }
    if (typeof user.hasPermission === 'function') {
      return user.hasPermission("ACTOR_CREATE");
    }
    if (typeof user.can === 'function') {
      return user.can("ACTOR_CREATE");
    }
    return true;
  })();

  if (!canCreateActor) return;

  const wrapper = document.createElement('div');
  wrapper.className = `${MONSTER_CREATOR_ID}-directory-button-wrap`;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `monster-creator-button create-document ${MONSTER_CREATOR_ID}-button`;
  if (isJhowModeEnabled()) {
    button.classList.add('monster-creator-jhow-button');
  }
  button.textContent = getJhowButtonLabel();
  button.addEventListener('click', () => {
    new MonsterCreatorForm().render(true);
  });

  wrapper.appendChild(button);

  const target = [
    '.app-header .header-actions',
    '.window-header .header-actions',
    '.header-actions',
    '.sidebar-tab .header-controls',
    '.app-header .header-content',
    '.app-sidebar .directory-header',
    '.directory-header',
    '.directory-footer',
    '.directory-list',
    '.window-content',
    'body'
  ]
    .map((selector) => root.querySelector(selector))
    .find((node) => !!node);

  if (target) {
    target.appendChild(wrapper);
  }
};

Hooks.on('renderActorDirectory', (_app, html) => {
  addMonsterCreatorButton(null, html);
});

Hooks.on('renderSidebarTab', (app, html) => {
  if (!app?.options?.id || app.options.id !== 'actors') return;
  addMonsterCreatorButton(app, html);
});

Hooks.once('ready', () => {
  const actorDirectory = ui?.actors;
  if (!actorDirectory?.element) {
    return;
  }

  addMonsterCreatorButton(actorDirectory, actorDirectory.element);
});
