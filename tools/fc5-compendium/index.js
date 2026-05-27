const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { documentIconKey, readOverrides } = require('./icon-tools.js');

const MODULE_ID = 'monster-creator';

const PACK_CONFIG = {
  spells: { sourceDir: 'fc5-spells', packDir: 'fc5-spells', packName: 'fc5spells', type: 'Item', folderName: 'Spells' },
  items: { sourceDir: 'fc5-items', packDir: 'fc5-items', packName: 'fc5items', type: 'Item', folderName: 'Items' },
  classes: { sourceDir: 'fc5-classes', packDir: 'fc5-classes', packName: 'fc5classes', type: 'Item', folderName: 'Classes' },
  subclasses: { sourceDir: 'fc5-subclasses', packDir: 'fc5-subclasses', packName: 'fc5subclasses', type: 'Item', folderName: 'Subclasses' },
  features: { sourceDir: 'fc5-features', packDir: 'fc5-features', packName: 'fc5features', type: 'Item', folderName: 'Features' }
};

const TOP_LEVEL_TAGS = ['background', 'class', 'feat', 'item', 'monster', 'race', 'spell'];

const XML_ENTITIES = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  quot: '"'
};

const SKILL_MAP = {
  Acrobatics: 'acr',
  'Animal Handling': 'ani',
  Arcana: 'arc',
  Athletics: 'ath',
  Deception: 'dec',
  History: 'his',
  Insight: 'ins',
  Intimidation: 'itm',
  Investigation: 'inv',
  Medicine: 'med',
  Nature: 'nat',
  Perception: 'prc',
  Performance: 'prf',
  Persuasion: 'per',
  Religion: 'rel',
  'Sleight of Hand': 'slt',
  Stealth: 'ste',
  Survival: 'sur'
};

const SAVE_MAP = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha'
};

const SPELL_ABILITY_MAP = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha'
};

const SPELL_SCHOOL_MAP = {
  A: 'abj',
  C: 'con',
  D: 'div',
  EN: 'enc',
  EV: 'evo',
  I: 'ill',
  N: 'nec',
  T: 'trs'
};

const DAMAGE_TYPE_MAP = {
  A: 'acid',
  B: 'bludgeoning',
  C: 'cold',
  F: 'fire',
  FC: 'force',
  L: 'lightning',
  N: 'necrotic',
  P: 'piercing',
  PS: 'psychic',
  PY: 'poison',
  R: 'radiant',
  S: 'slashing',
  T: 'thunder'
};

const WORD_DAMAGE_TYPE_MAP = {
  acid: 'acid',
  bludgeoning: 'bludgeoning',
  cold: 'cold',
  fire: 'fire',
  force: 'force',
  healing: 'healing',
  lightning: 'lightning',
  necrotic: 'necrotic',
  piercing: 'piercing',
  poison: 'poison',
  psychic: 'psychic',
  radiant: 'radiant',
  slashing: 'slashing',
  thunder: 'thunder'
};

const STANDARD_DAMAGE_TYPES = [
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder'
];

const ITEM_PROPERTY_MAP = {
  '2H': 'two',
  A: 'amm',
  F: 'fin',
  H: 'hvy',
  L: 'lgt',
  LD: 'lod',
  R: 'rch',
  S: 'spc',
  T: 'thr',
  V: 'ver'
};

const ARMOR_CATEGORY_MAP = {
  LA: 'light',
  MA: 'medium',
  HA: 'heavy',
  S: 'shield'
};

const RECOVERY_MAP = {
  D: 'day',
  L: 'lr',
  S: 'sr'
};

const NUMBER_WORD_MAP = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5
};

const ITEM_TYPE_MAP = {
  A: 'loot',
  G: 'equipment',
  HA: 'equipment',
  LA: 'equipment',
  M: 'weapon',
  MA: 'equipment',
  P: 'consumable',
  R: 'weapon',
  RD: 'equipment',
  RG: 'equipment',
  S: 'equipment',
  SC: 'consumable',
  ST: 'equipment',
  W: 'equipment',
  WD: 'equipment',
  $: 'loot'
};

const CONSUMABLE_TYPE_MAP = {
  P: 'potion',
  SC: 'scroll'
};

const ITEM_ICON_MAP = {
  class: 'icons/svg/book.svg',
  consumable: 'icons/consumables/potions/potion-tube-corked-red.webp',
  equipment: 'icons/svg/item-bag.svg',
  feat: 'icons/svg/book.svg',
  loot: 'icons/svg/chest.svg',
  spell: 'icons/magic/symbols/question-stone-yellow.webp',
  subclass: 'icons/svg/book.svg',
  tool: 'icons/svg/hammer.svg',
  weapon: 'icons/svg/sword.svg'
};

const SOURCE_CATEGORY = {
  HOMEBREW: 'homebrew',
  OFFICIAL: 'official',
  THIRD_PARTY: 'third-party',
  UA: 'ua',
  UNKNOWN: 'unknown'
};

const SOURCE_TAG_PATTERN = '(?:Homebrew|HB|UA|Unearthed Arcana|Third[-\\s]?Party|Indie|Partnered[-\\s]?Official|Semi[-\\s]?Official|MercerBrew)';

const OFFICIAL_2014_SOURCE_PATTERNS = [
  /Acquisitions Incorporated/i,
  /Basic Rules/i,
  /Baldur's Gate: Descent into Avernus/i,
  /Bigby Presents: Glory of the Giants/i,
  /Book of Many Things/i,
  /Dungeon Master's Guide(?!\s*\(2024\))/i,
  /Eberron: Rising from the Last War/i,
  /Elemental Evil Player's Companion/i,
  /Explorer's Guide to Wildemount/i,
  /Fizban's Treasury of Dragons/i,
  /Guildmasters' Guide to Ravnica/i,
  /Monster Manual(?!\s*\(2025\))/i,
  /Mythic Odysseys of Theros/i,
  /Player's Handbook(?!\s*\(2024\))/i,
  /Planescape: Adventures in the Multiverse/i,
  /Strixhaven: Curriculum of Chaos/i,
  /Sword Coast Adventurer's Guide/i,
  /Tasha's Cauldron of Everything/i,
  /Van Richten's Guide to Ravenloft/i,
  /Xanathar's Guide to Everything/i
];

const OFFICIAL_2024_SOURCE_PATTERNS = [
  /Dungeon Master's Guide\s*\(2024\)/i,
  /Free Rules\s*\(2024\)/i,
  /Monster Manual\s*\(2025\)/i,
  /Player's Handbook\s*\(2024\)/i
];

const THIRD_PARTY_SOURCE_PATTERNS = [
  /Tal'Dorei Campaign Setting: Reborn/i
];

const PRIMARY_ABILITY_OVERRIDES = {
  barbarian: ['str'],
  bard: ['cha'],
  cleric: ['wis'],
  druid: ['wis'],
  fighter: ['str', 'dex'],
  monk: ['dex', 'wis'],
  paladin: ['str', 'cha'],
  ranger: ['dex', 'wis'],
  rogue: ['dex'],
  sorcerer: ['cha'],
  warlock: ['cha'],
  wizard: ['int'],
  artificer: ['int']
};

const SPELLCASTING_PROGRESSION_OVERRIDES = {
  artificer: 'half',
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  paladin: 'half',
  ranger: 'half',
  sorcerer: 'full',
  warlock: 'pact',
  wizard: 'full'
};

const CLASS_SCALE_VALUE_IDS = {
  barbarian: {
    rages: '62svnflxsuad7oar',
    'rage-damage': 't42incolsbuqn2ec',
    'brutal-critical': 'y0kr48pnq5doebeb'
  },
  bard: {
    inspiration: '0Ybu5yMjplpTAHiE',
    'song-of-rest': 'TK2RAm9EFQtVjDrU',
    'cantrips-known': 'ovKbtrhfIkYTuThu',
    'spells-known': '9FXWVh7OmbPr1iR9'
  },
  cleric: {
    'channel-divinity': 'oOvaOWkQdMJHHwzo',
    'destroy-undead': 'bRWP2zsP33jeZcUY',
    'cantrips-known': 'b6vbDSfWTwxqyTke'
  },
  druid: {
    'wild-shape': 'eX43MTPVUV9VB0dK',
    'cantrips-known': 'Gfzu57bEFMsekg7v',
    'wild-shape-uses': 'PKUB0owJROhnfPwq'
  },
  fighter: {
    indomitable: 'B7YpSu4cVsEbHbrv',
    'action-surge': 'kxiasN1v8KFm9nse'
  },
  monk: {
    die: 'MXFbf0nxMiyLdPbX',
    'unarmored-movement': '1OzfWDWCquoHMeX5'
  },
  paladin: {
    'aura-radius': 'J6UYtKD0wkJQ9CHT'
  },
  ranger: {
    'spells-known': 'FYvhuTSScSJTfYBM'
  },
  rogue: {
    'sneak-attack': '81nHtANt6Ffg9M4V'
  },
  sorcerer: {
    'cantrips-known': 'rSUZv6eYOPRtikhv',
    'spells-known': 'Wr4j8nEA7gZxzW5Z'
  },
  warlock: {
    'cantrips-known': 'IXXGQe1feA5cBsOH',
    'spells-known': 'zfiyBsaOuE359vfA'
  },
  wizard: {
    'cantrips-known': 'r4NBaBhA20gUjJ56'
  }
};

const CLASS_EXPERTISE_IDS = {
  bard: {
    3: 'cwu9uhmtcKhqli8W',
    10: 'O2cVH7Y5kNfoUyLg'
  },
  rogue: {
    1: 'TDHYngxGqDHllgzw',
    6: 'Iozyk39gsM4Kecex'
  }
};

const CANTRIPS_KNOWN_CLASSES = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'warlock', 'wizard']);
const SPELLS_KNOWN_CLASSES = new Set(['bard', 'ranger', 'sorcerer', 'warlock']);

const WEAPON_PROFICIENCY_GRANT_MAP = {
  battleaxe: 'weapon:mar:battleaxe',
  blowgun: 'weapon:mar:blowgun',
  club: 'weapon:sim:club',
  dagger: 'weapon:sim:dagger',
  dart: 'weapon:sim:dart',
  flail: 'weapon:mar:flail',
  glaive: 'weapon:mar:glaive',
  greataxe: 'weapon:mar:greataxe',
  greatclub: 'weapon:sim:greatclub',
  greatsword: 'weapon:mar:greatsword',
  halberd: 'weapon:mar:halberd',
  handaxe: 'weapon:sim:handaxe',
  handcrossbow: 'weapon:mar:handcrossbow',
  heavycrossbow: 'weapon:mar:heavycrossbow',
  javelin: 'weapon:sim:javelin',
  lance: 'weapon:mar:lance',
  lightcrossbow: 'weapon:sim:lightcrossbow',
  lighthammer: 'weapon:sim:lighthammer',
  longbow: 'weapon:mar:longbow',
  longsword: 'weapon:mar:longsword',
  mace: 'weapon:sim:mace',
  maul: 'weapon:mar:maul',
  morningstar: 'weapon:mar:morningstar',
  musket: 'weapon:mar:musket',
  pike: 'weapon:mar:pike',
  pistol: 'weapon:mar:pistol',
  quarterstaff: 'weapon:sim:quarterstaff',
  rapier: 'weapon:mar:rapier',
  scimitar: 'weapon:mar:scimitar',
  shortbow: 'weapon:sim:shortbow',
  shortsword: 'weapon:mar:shortsword',
  sickle: 'weapon:sim:sickle',
  sling: 'weapon:sim:sling',
  spear: 'weapon:sim:spear',
  trident: 'weapon:mar:trident',
  warpick: 'weapon:mar:warpick',
  warhammer: 'weapon:mar:warhammer',
  whip: 'weapon:mar:whip'
};

const ABILITY_ID_MAP = {
  str: 'str',
  strength: 'str',
  dex: 'dex',
  dexterity: 'dex',
  con: 'con',
  constitution: 'con',
  int: 'int',
  intelligence: 'int',
  wis: 'wis',
  wisdom: 'wis',
  cha: 'cha',
  charisma: 'cha'
};

const ACTIVE_EFFECT_MODE = {
  ADD: 2,
  OVERRIDE: 5
};

const SPELL_STATUS_EFFECTS = {
  blinded: {
    name: 'Blindness',
    img: 'systems/dnd5e/icons/svg/statuses/blinded.svg'
  },
  charmed: {
    name: 'Charmed',
    img: 'systems/dnd5e/icons/svg/statuses/charmed.svg'
  },
  deafened: {
    name: 'Deafness',
    img: 'systems/dnd5e/icons/svg/statuses/deafened.svg'
  },
  frightened: {
    name: 'Frightened',
    img: 'systems/dnd5e/icons/svg/statuses/frightened.svg'
  },
  grappled: {
    name: 'Grappled',
    img: 'systems/dnd5e/icons/svg/statuses/grappled.svg'
  },
  incapacitated: {
    name: 'Incapacitated',
    img: 'systems/dnd5e/icons/svg/statuses/incapacitated.svg'
  },
  invisible: {
    name: 'Invisible',
    img: 'systems/dnd5e/icons/svg/statuses/invisible.svg'
  },
  paralyzed: {
    name: 'Paralyzed',
    img: 'systems/dnd5e/icons/svg/statuses/paralyzed.svg'
  },
  petrified: {
    name: 'Petrified',
    img: 'systems/dnd5e/icons/svg/statuses/petrified.svg'
  },
  poisoned: {
    name: 'Poisoned',
    img: 'systems/dnd5e/icons/svg/statuses/poisoned.svg'
  },
  prone: {
    name: 'Prone',
    img: 'systems/dnd5e/icons/svg/statuses/prone.svg'
  },
  restrained: {
    name: 'Restrained',
    img: 'systems/dnd5e/icons/svg/statuses/restrained.svg'
  },
  stunned: {
    name: 'Stunned',
    img: 'systems/dnd5e/icons/svg/statuses/stunned.svg'
  },
  unconscious: {
    name: 'Unconscious',
    img: 'systems/dnd5e/icons/svg/statuses/unconscious.svg'
  }
};

const SPELL_EFFECT_NAME_OVERRIDES = {
  befuddlement: 'Befuddled',
  confusion: 'Confused'
};

function decodeXmlEntities(value = '') {
  return String(value).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith('#x')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }

    return XML_ENTITIES[entity] || match;
  });
}

function normalizeWhitespace(value = '') {
  return String(value)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function trimSlugToken(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .toLowerCase();
}

function normalizeSearchText(value = '') {
  return normalizeWhitespace(value).toLowerCase();
}

function matchesSourcePatterns(value = '', patterns = []) {
  return patterns.some((pattern) => pattern.test(value));
}

function inferSourceCategory({ book = '', name = '', sourceLine = '' } = {}) {
  const sourceText = [book, name, sourceLine].filter(Boolean).join(' ');
  const normalized = normalizeSearchText(sourceText);
  if (!normalized) {
    return SOURCE_CATEGORY.UNKNOWN;
  }

  if (/unearthed arcana|playtest/.test(normalized) || /\((?:[^)]*ua[^)]*)\)/i.test(name)) {
    return SOURCE_CATEGORY.UA;
  }

  if (/third party/.test(normalized) || matchesSourcePatterns(sourceText, THIRD_PARTY_SOURCE_PATTERNS)) {
    return SOURCE_CATEGORY.THIRD_PARTY;
  }

  if (/homebrew/.test(normalized) || /\((?:[^)]*hb[^)]*)\)/i.test(name)) {
    return SOURCE_CATEGORY.HOMEBREW;
  }

  if (matchesSourcePatterns(sourceText, OFFICIAL_2024_SOURCE_PATTERNS)
    || matchesSourcePatterns(sourceText, OFFICIAL_2014_SOURCE_PATTERNS)) {
    return SOURCE_CATEGORY.OFFICIAL;
  }

  return SOURCE_CATEGORY.UNKNOWN;
}

function inferSourceRules({ book = '', name = '', identifier = '', sourceLine = '' } = {}) {
  const sourceText = [book, sourceLine].filter(Boolean).join(' ');
  const explicitBookEdition = sourceText.match(/\((2014|2024|2025)\)/);
  if (explicitBookEdition) {
    return explicitBookEdition[1] === '2025' ? '2024' : explicitBookEdition[1];
  }

  const explicitNameEdition = String(name || '').match(/\[(2014|2024)\]/);
  if (explicitNameEdition) {
    return explicitNameEdition[1];
  }

  if (/(?:^|-)2024$/.test(String(identifier || ''))) {
    return '2024';
  }

  if (matchesSourcePatterns(sourceText, OFFICIAL_2024_SOURCE_PATTERNS)) {
    return '2024';
  }

  if (matchesSourcePatterns(sourceText, OFFICIAL_2014_SOURCE_PATTERNS)) {
    return '2014';
  }

  return '';
}

function normalizeSourceRecord(source = {}, hints = {}) {
  const book = normalizeWhitespace(source.book || '');
  const page = normalizeWhitespace(source.page || '');
  const custom = normalizeWhitespace(source.custom || '');
  const license = normalizeWhitespace(source.license || '');
  const sourceLine = normalizeWhitespace(hints.sourceLine || '');
  const rules = normalizeWhitespace(source.rules || '') || inferSourceRules({
    book,
    name: hints.name,
    identifier: hints.identifier,
    sourceLine
  });
  const sourceCategory = inferSourceCategory({
    book,
    name: hints.name,
    sourceLine
  });

  return {
    custom,
    book,
    page,
    license,
    rules,
    sourceCategory
  };
}

function deterministicId(seed) {
  return crypto.createHash('sha1').update(String(seed)).digest('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
}

function safeNumber(value, fallback = 0) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanYesNo(value) {
  return String(value || '').trim().toUpperCase() === 'YES';
}

function parseXmlAttributes(raw = '') {
  const attrs = {};
  for (const match of raw.matchAll(/([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[match[1]] = decodeXmlEntities(match[2]);
  }
  return attrs;
}

function parseXmlFragment(fragment) {
  const tokenPattern = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<\/?[A-Za-z0-9_-]+(?:\s+[^<>]*?)?\/?>|[^<]+/g;
  const stack = [];
  let root = null;

  for (const token of fragment.match(tokenPattern) || []) {
    if (!token) continue;
    if (token.startsWith('<?') || token.startsWith('<!DOCTYPE') || token.startsWith('<!--')) {
      continue;
    }

    if (token.startsWith('</')) {
      const node = stack.pop();
      if (!node) continue;
      node.text = node.textParts.join('');
      delete node.textParts;
      if (!stack.length) {
        root = node;
      } else {
        stack[stack.length - 1].children.push(node);
      }
      continue;
    }

    if (token.startsWith('<')) {
      const selfClosing = token.endsWith('/>');
      const content = token.slice(1, token.length - (selfClosing ? 2 : 1)).trim();
      const spaceIndex = content.search(/\s/);
      const name = spaceIndex === -1 ? content : content.slice(0, spaceIndex);
      const attrSource = spaceIndex === -1 ? '' : content.slice(spaceIndex + 1);
      const node = {
        name,
        attrs: parseXmlAttributes(attrSource),
        children: [],
        textParts: [],
        text: ''
      };

      if (selfClosing) {
        if (!stack.length) {
          root = node;
        } else {
          stack[stack.length - 1].children.push(node);
        }
      } else {
        stack.push(node);
      }
      continue;
    }

    if (stack.length) {
      stack[stack.length - 1].textParts.push(decodeXmlEntities(token));
    }
  }

  return root;
}

function childrenByName(node, name) {
  return (node?.children || []).filter((child) => child.name === name);
}

function firstChild(node, name) {
  return childrenByName(node, name)[0] || null;
}

function nodeText(node) {
  if (!node) return '';
  const own = normalizeWhitespace(node.text || '');
  const childText = (node.children || []).map((child) => nodeText(child)).filter(Boolean).join('\n');
  if (own && childText) return `${own}\n${childText}`;
  return own || childText || '';
}

function childText(node, name, fallback = '') {
  const child = firstChild(node, name);
  if (!child) return fallback;
  const text = normalizeWhitespace(nodeText(child));
  return text || fallback;
}

function parseModifier(node) {
  return {
    category: String(node?.attrs?.category || '').trim(),
    value: normalizeWhitespace(nodeText(node))
  };
}

function parseRoll(node) {
  return {
    description: String(node?.attrs?.description || '').trim(),
    level: safeNumber(node?.attrs?.level, null),
    formula: normalizeWhitespace(nodeText(node))
  };
}

function parseFeature(node) {
  return {
    name: childText(node, 'name'),
    text: childText(node, 'text'),
    optional: parseBooleanYesNo(node?.attrs?.optional),
    subclass: childText(node, 'subclass'),
    modifiers: childrenByName(node, 'modifier').map(parseModifier),
    rolls: childrenByName(node, 'roll').map(parseRoll)
  };
}

function parseCounter(node) {
  return {
    name: childText(node, 'name'),
    value: childText(node, 'value'),
    reset: childText(node, 'reset'),
    subclass: childText(node, 'subclass')
  };
}

function parseSlotsText(text = '') {
  return String(text)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => safeNumber(part, 0));
}

function parseTrait(node) {
  return {
    name: childText(node, 'name'),
    text: childText(node, 'text'),
    roll: childText(node, 'roll'),
    category: String(node?.attrs?.category || '').trim()
  };
}

function parseClassRecord(node) {
  return {
    name: childText(node, 'name'),
    hd: childText(node, 'hd'),
    proficiency: childText(node, 'proficiency'),
    numSkills: safeNumber(childText(node, 'numSkills'), 0),
    armor: childText(node, 'armor'),
    weapons: childText(node, 'weapons'),
    tools: childText(node, 'tools'),
    wealth: childText(node, 'wealth'),
    spellAbility: childText(node, 'spellAbility'),
    slotsReset: childText(node, 'slotsReset'),
    traits: childrenByName(node, 'trait').map(parseTrait),
    autolevels: childrenByName(node, 'autolevel').map((entry) => ({
      level: safeNumber(entry?.attrs?.level, 0),
      scoreImprovement: parseBooleanYesNo(entry?.attrs?.scoreImprovement),
      slots: parseSlotsText(childText(entry, 'slots')),
      features: childrenByName(entry, 'feature').map(parseFeature),
      counters: childrenByName(entry, 'counter').map(parseCounter)
    }))
  };
}

function parseSpellRecord(node) {
  return {
    name: childText(node, 'name'),
    level: safeNumber(childText(node, 'level'), 0),
    school: childText(node, 'school'),
    ritual: parseBooleanYesNo(childText(node, 'ritual')),
    time: childText(node, 'time'),
    range: childText(node, 'range'),
    components: childText(node, 'components'),
    duration: childText(node, 'duration'),
    classes: childText(node, 'classes'),
    text: childText(node, 'text'),
    modifiers: childrenByName(node, 'modifier').map(parseModifier),
    rolls: childrenByName(node, 'roll').map(parseRoll)
  };
}

function parseItemRecord(node) {
  return {
    name: childText(node, 'name'),
    detail: childText(node, 'detail'),
    typeCode: childText(node, 'type'),
    magic: parseBooleanYesNo(childText(node, 'magic')),
    weight: childText(node, 'weight'),
    value: childText(node, 'value'),
    ac: childText(node, 'ac'),
    property: childText(node, 'property'),
    dmg1: childText(node, 'dmg1'),
    dmg2: childText(node, 'dmg2'),
    dmgType: childText(node, 'dmgType'),
    range: childText(node, 'range'),
    text: childText(node, 'text'),
    modifiers: childrenByName(node, 'modifier').map(parseModifier),
    rolls: childrenByName(node, 'roll').map(parseRoll)
  };
}

function extractTopLevelEntries(xmlText) {
  const grouped = {
    backgrounds: [],
    classes: [],
    feats: [],
    items: [],
    monsters: [],
    races: [],
    spells: []
  };

  const topLevelPattern = new RegExp(`<(${TOP_LEVEL_TAGS.join('|')})>[\\s\\S]*?<\\/\\1>`, 'g');
  for (const match of xmlText.matchAll(topLevelPattern)) {
    const tag = match[1];
    const root = parseXmlFragment(match[0]);
    if (!root) continue;

    if (tag === 'class') {
      grouped.classes.push(parseClassRecord(root));
      continue;
    }

    if (tag === 'spell') {
      grouped.spells.push(parseSpellRecord(root));
      continue;
    }

    if (tag === 'item') {
      grouped.items.push(parseItemRecord(root));
      continue;
    }

    if (tag === 'feat') {
      grouped.feats.push({
        name: childText(root, 'name'),
        prerequisite: childText(root, 'prerequisite'),
        text: childText(root, 'text'),
        modifiers: childrenByName(root, 'modifier').map(parseModifier)
      });
    }
  }

  return grouped;
}

function splitSourceText(value = '', hints = {}) {
  const raw = normalizeWhitespace(value);
  if (!raw) {
    return {
      content: '',
      sourceLine: '',
      source: normalizeSourceRecord({}, hints)
    };
  }

  const lines = raw.split('\n');
  let sourceIndex = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (/^\s*Source:\s*/i.test(lines[index])) {
      sourceIndex = index;
      break;
    }
  }

  const contentLines = sourceIndex >= 0 ? lines.slice(0, sourceIndex) : lines.slice();
  const sourceLine = sourceIndex >= 0 ? lines.slice(sourceIndex).join(' ').replace(/^\s*Source:\s*/i, '').trim() : '';

  const parsedSource = parseSourceCitation(sourceLine);

  return {
    content: contentLines.join('\n').trim(),
    sourceLine,
    source: normalizeSourceRecord({
      custom: '',
      book: parsedSource.book,
      page: parsedSource.page,
      license: '',
      rules: ''
    }, { ...hints, sourceLine: parsedSource.citation })
  };
}

function parseSourceCitation(sourceLine = '') {
  const citation = normalizeWhitespace(sourceLine).split(/\s*,\s+/)[0] || '';
  if (!citation) return { book: '', page: '', citation: '' };

  const pageMatch = citation.match(new RegExp(`\\bp\\.\\s*([0-9A-Za-z-]+)(?:\\s*\\(${SOURCE_TAG_PATTERN}\\))?\\s*$`, 'i'));
  if (!pageMatch) {
    return {
      book: stripSourceCategorySuffix(citation),
      page: '',
      citation
    };
  }

  return {
    book: citation.slice(0, pageMatch.index).trim(),
    page: pageMatch[1],
    citation
  };
}

function stripSourceCategorySuffix(value = '') {
  return normalizeWhitespace(value).replace(new RegExp(`\\s*\\(${SOURCE_TAG_PATTERN}\\)\\s*$`, 'i'), '').trim();
}

function textToHtml(value = '') {
  const text = normalizeWhitespace(value);
  if (!text) return '';

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => paragraph
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('<br />'));

  return paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('');
}

function buildSourceFlags(entry, sourceType, extras = {}) {
  return {
    [MODULE_ID]: {
      fc5: {
        type: sourceType,
        originalName: entry.name,
        sourceBook: entry.source?.book || '',
        sourcePage: entry.source?.page || '',
        rules: entry.source?.rules || '',
        sourceCategory: entry.source?.sourceCategory || SOURCE_CATEGORY.UNKNOWN,
        sourceClasses: entry.classes || '',
        detail: entry.detail || '',
        raw: entry.raw,
        ...extras
      }
    }
  };
}

let iconOverrideCache = null;

function getIconOverrides() {
  if (!iconOverrideCache) {
    iconOverrideCache = readOverrides();
  }
  return iconOverrideCache;
}

function inferPackNameForDocument(document) {
  if (document.type === 'spell') return PACK_CONFIG.spells.packName;
  if (document.type === 'class') return PACK_CONFIG.classes.packName;
  if (document.type === 'subclass') return PACK_CONFIG.subclasses.packName;
  if (document.type === 'feat') return PACK_CONFIG.features.packName;
  return PACK_CONFIG.items.packName;
}

function resolveGeneratedIcon(document, packName = '') {
  const override = getIconOverrides()[documentIconKey(document, packName || inferPackNameForDocument(document))];
  return override?.approved && override.img ? override.img : document.img;
}

function normalizeDocumentBase({ id, name, type, img, system, flags, effects = [], packName = '' }) {
  const document = {
    _id: id,
    _key: `!items!${id}`,
    name,
    type,
    img,
    system,
    effects,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags
  };

  document.img = resolveGeneratedIcon(document, packName);
  return document;
}

function normalizeModifierCategory(category = '') {
  return String(category || '').trim().toLowerCase();
}

function normalizeModifierSubject(subject = '') {
  return String(subject || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeModifierFormula(value = '') {
  const compact = String(value || '').replace(/\s+/g, '');
  if (!compact) return '';

  const sign = compact.startsWith('-') ? '-' : '+';
  const body = compact.replace(/^[+-]/, '');
  if (/^\d+$/.test(body)) {
    return `${sign}${body}`;
  }

  if (body === '%0') {
    return `${sign}@prof`;
  }

  return '';
}

function parseModifierDescriptor(modifier) {
  const raw = normalizeWhitespace(modifier?.value || '');
  const match = raw.match(/^(.*?)\s*([+-]\s*(?:\d+|%\d+))$/i);
  if (!match) {
    return null;
  }

  const formula = normalizeModifierFormula(match[2]);
  if (!formula) {
    return null;
  }

  return {
    raw,
    category: normalizeModifierCategory(modifier?.category),
    subject: normalizeModifierSubject(match[1]),
    formula
  };
}

function resolveAbilityId(value = '') {
  const normalized = normalizeModifierSubject(String(value || '').replace(/\bscore\b/g, '').replace(/\bsave\b/g, ''));
  return ABILITY_ID_MAP[normalized] || '';
}

function resolveSkillId(value = '') {
  const normalized = normalizeModifierSubject(value);
  for (const [label, id] of Object.entries(SKILL_MAP)) {
    if (normalizeModifierSubject(label) === normalized) {
      return id;
    }
  }

  return '';
}

function buildEffectChange(key, value, mode = ACTIVE_EFFECT_MODE.ADD) {
  return {
    key,
    mode,
    value,
    priority: null
  };
}

function mapBonusModifierChanges(subject, formula) {
  switch (subject) {
    case 'ac':
      return [buildEffectChange('system.attributes.ac.bonus', formula)];
    case 'initiative':
      return [buildEffectChange('system.attributes.init.bonus', formula)];
    case 'speed':
      return [buildEffectChange('system.attributes.movement.bonus', formula)];
    case 'saving throws':
      return [buildEffectChange('system.bonuses.abilities.save', formula)];
    case 'ability checks':
      return [buildEffectChange('system.bonuses.abilities.check', formula)];
    case 'weapon attacks':
      return [
        buildEffectChange('system.bonuses.mwak.attack', formula),
        buildEffectChange('system.bonuses.rwak.attack', formula)
      ];
    case 'weapon damage':
      return [
        buildEffectChange('system.bonuses.mwak.damage', formula),
        buildEffectChange('system.bonuses.rwak.damage', formula)
      ];
    case 'melee attacks':
      return [buildEffectChange('system.bonuses.mwak.attack', formula)];
    case 'melee damage':
      return [buildEffectChange('system.bonuses.mwak.damage', formula)];
    case 'ranged attacks':
      return [buildEffectChange('system.bonuses.rwak.attack', formula)];
    case 'ranged damage':
      return [buildEffectChange('system.bonuses.rwak.damage', formula)];
    case 'spell attack':
      return [
        buildEffectChange('system.bonuses.msak.attack', formula),
        buildEffectChange('system.bonuses.rsak.attack', formula)
      ];
    case 'spell dc':
      return [buildEffectChange('system.bonuses.spell.dc', formula)];
    default:
      return [];
  }
}

function mapAbilityScoreModifierChanges(subject, formula) {
  const abilityId = resolveAbilityId(subject);
  if (!abilityId) {
    return [];
  }

  return [buildEffectChange(`system.abilities.${abilityId}.value`, formula)];
}

function mapSkillModifierChanges(subject, formula) {
  const skillId = resolveSkillId(subject);
  if (!skillId) {
    return [];
  }

  return [buildEffectChange(`system.skills.${skillId}.bonuses.check`, formula)];
}

function mapSavingThrowModifierChanges(subject, formula) {
  const abilityId = resolveAbilityId(subject);
  if (!abilityId) {
    return [];
  }

  return [buildEffectChange(`system.abilities.${abilityId}.bonuses.save`, formula)];
}

function mapModifierToChanges(modifier) {
  const descriptor = parseModifierDescriptor(modifier);
  if (!descriptor) {
    return {
      changes: [],
      reason: 'unsupported-format'
    };
  }

  let changes = [];
  if (descriptor.category === 'bonus') {
    changes = mapBonusModifierChanges(descriptor.subject, descriptor.formula);
  } else if (descriptor.category === 'ability score') {
    changes = mapAbilityScoreModifierChanges(descriptor.subject, descriptor.formula);
  } else if (descriptor.category === 'skill') {
    changes = mapSkillModifierChanges(descriptor.subject, descriptor.formula);
  } else if (descriptor.category === 'saving throw') {
    changes = mapSavingThrowModifierChanges(descriptor.subject, descriptor.formula);
  } else {
    return {
      changes: [],
      reason: 'unsupported-category'
    };
  }

  if (!changes.length) {
    return {
      changes: [],
      reason: 'unsupported-subject'
    };
  }

  return {
    changes,
    reason: ''
  };
}

function buildEffectOrigin(packName, id) {
  return `Compendium.${MODULE_ID}.${packName}.Item.${id}`;
}

function buildEffectDurationData(duration = null) {
  if (duration) {
    return {
      startTime: null,
      seconds: duration.seconds ?? null,
      combat: null,
      rounds: duration.rounds ?? null,
      turns: duration.turns ?? null,
      startRound: null,
      startTurn: null
    };
  }

  return {
    startTime: null,
    seconds: null,
    combat: null,
    rounds: null,
    turns: null,
    startRound: null,
    startTurn: null
  };
}

function buildActiveEffect({
  documentId,
  packName,
  documentName,
  img,
  changes,
  disabled = false,
  seed = '',
  transfer = true,
  description = '',
  statuses = [],
  duration = null
}) {
  const effectId = deterministicId([
    'effect',
    packName,
    documentId,
    seed,
    JSON.stringify(changes)
  ].join('|'));

  return {
    _id: effectId,
    changes,
    disabled,
    duration: buildEffectDurationData(duration),
    origin: buildEffectOrigin(packName, documentId),
    transfer,
    flags: {},
    tint: '#ffffff',
    name: documentName,
    description,
    statuses,
    img,
    type: 'base',
    system: {},
    sort: 0,
    _key: `!items.effects!${documentId}.${effectId}`
  };
}

function buildDocumentEffects({
  modifiers = [],
  documentId,
  packName,
  documentName,
  img,
  disabled = false,
  transfer = true,
  description = '',
  statuses = [],
  duration = null
}) {
  const effects = [];
  const unmapped = [];

  for (const [index, modifier] of (modifiers || []).entries()) {
    const result = mapModifierToChanges(modifier);
    if (!result.changes.length) {
      unmapped.push({
        category: modifier.category,
        value: modifier.value,
        reason: result.reason || 'unsupported'
      });
      continue;
    }

    effects.push(buildActiveEffect({
      documentId,
      packName,
      documentName,
      img,
      changes: result.changes,
      disabled,
      seed: `${index}|${modifier.category}|${modifier.value}`,
      transfer,
      description,
      statuses,
      duration
    }));
  }

  return {
    effects,
    unmapped
  };
}

function inferUnarmoredDefenseCalc({ ownerIdentifier = '', ownerName = '', text = '' } = {}) {
  const featureText = normalizeSearchText(text);
  const ownerText = normalizeSearchText(`${ownerIdentifier} ${ownerName}`);

  if (/\bconstitution modifier\b/.test(featureText) || /\bbarbarian\b/.test(ownerText)) {
    return 'unarmoredBarb';
  }

  if (/\bwisdom modifier\b/.test(featureText) || /\bmonk\b/.test(ownerText)) {
    return 'unarmoredMonk';
  }

  if (/\bcharisma modifier\b/.test(featureText) || /\bbard\b/.test(ownerText)) {
    return 'unarmoredBard';
  }

  return '';
}

function hasUnarmoredDefenseFormula(featureName = '', text = '') {
  if (trimSlugToken(featureName) === 'unarmored-defense') {
    return true;
  }

  const featureText = normalizeSearchText(text);
  return /\b(?:armor class|ac) equals 10 \+ your dexterity modifier \+ your (?:constitution|wisdom|charisma) modifier\b/.test(featureText);
}

function inferDamageResistanceChanges(text = '') {
  const featureText = normalizeSearchText(text);
  if (!/\bresistant to all damage types\b/.test(featureText)) {
    return [];
  }

  return [
    buildEffectChange('system.traits.dr.value', STANDARD_DAMAGE_TYPES.join(';'))
  ];
}

function buildFeaturePassiveEffects({
  ownerIdentifier = '',
  ownerName = '',
  featureName = '',
  text = '',
  documentId,
  documentName,
  img
}) {
  const changes = [];
  const seeds = [];

  if (hasUnarmoredDefenseFormula(featureName, text)) {
    const calc = inferUnarmoredDefenseCalc({ ownerIdentifier, ownerName, text });
    if (calc) {
      changes.push(buildEffectChange('system.attributes.ac.calc', calc, ACTIVE_EFFECT_MODE.OVERRIDE));
      seeds.push(`unarmored-defense|${calc}`);
    }
  }

  const resistanceChanges = inferDamageResistanceChanges(text);
  if (resistanceChanges.length) {
    changes.push(...resistanceChanges);
    seeds.push('damage-resistance|all');
  }

  if (!changes.length) return [];

  return [buildActiveEffect({
    documentId,
    packName: PACK_CONFIG.features.packName,
    documentName,
    img,
    changes,
    seed: `passive|${seeds.join('|')}`
  })];
}

function stripEditionSuffix(name = '') {
  return String(name || '').replace(/\s*\[\d{4}\]\s*$/g, '').trim();
}

function effectNameForSpell(spellName = '') {
  const baseName = stripEditionSuffix(spellName);
  const identifier = trimSlugToken(baseName);
  return SPELL_EFFECT_NAME_OVERRIDES[identifier] || baseName;
}

function spellEffectDuration(duration = {}) {
  const value = safeNumber(duration.value, null);
  if (!value || !duration.units) {
    return null;
  }

  switch (duration.units) {
    case 'round':
      return { rounds: value, seconds: value * 6, turns: null };
    case 'turn':
      return { rounds: null, seconds: null, turns: value };
    case 'minute':
      return { rounds: null, seconds: value * 60, turns: null };
    case 'hour':
      return { rounds: null, seconds: value * 3600, turns: null };
    case 'day':
      return { rounds: null, seconds: value * 86400, turns: null };
    case 'week':
      return { rounds: null, seconds: value * 604800, turns: null };
    default:
      return null;
  }
}

function extractSentence(text = '', pattern) {
  const match = String(text || '').match(pattern);
  return match ? match[0].trim() : '';
}

function annotateRepeatSaveText(text = '', ability = '') {
  if (!text || !ability) {
    return text;
  }

  return String(text)
    .replace(/\brepeats the save\b/ig, `repeats the [[/save ability=${ability}]] save`)
    .replace(/\bsucceed on the save\b/ig, `succeed on the [[/save ability=${ability}]] save`);
}

function spellEffectDescription(spell, activity, hasStatuses = false) {
  const repeatSave = extractSentence(
    spell.descriptionText,
    /At the end of[^.?!]*(?:success|succeed)[^.?!]*[.?!]/i
  );
  if (hasStatuses && repeatSave) {
    return textToHtml(annotateRepeatSaveText(repeatSave, activity.save?.ability));
  }

  const failedSave = extractSentence(
    spell.descriptionText,
    /On a failed save,[\s\S]*?(?=(On a successful save|Using a Higher-Level Spell Slot|At Higher Levels\.|$))/i
  );
  if (failedSave) {
    return textToHtml(annotateRepeatSaveText(failedSave, activity.save?.ability));
  }

  return textToHtml(annotateRepeatSaveText(spell.descriptionText, activity.save?.ability));
}

function detectSpellStatuses(text = '') {
  const normalized = String(text || '').toLowerCase();
  return Object.keys(SPELL_STATUS_EFFECTS).filter((status) => {
    const pattern = new RegExp(`\\b${status}\\b`, 'i');
    return pattern.test(normalized);
  });
}

function shouldCreateSpellRiderEffect(spell, activity, statuses = []) {
  const text = String(spell.descriptionText || '');
  if (statuses.length) {
    return true;
  }

  if (activity.type !== 'save') {
    return false;
  }

  if (!/on a failed save|must succeed on [^.?!]+ saving throw,? or/i.test(text)) {
    return false;
  }

  return /(for the duration|repeats the save|can't|cannot|can’t|disadvantage|advantage|bonus actions?|reactions?|magic action|must roll|speed is|speed becomes|takes the [a-z]+ condition|condition)/i.test(text);
}

function buildSpellRiderEffects({ spell, activity, duration, documentId, img }) {
  const statuses = detectSpellStatuses(spell.descriptionText);
  if (!shouldCreateSpellRiderEffect(spell, activity, statuses)) {
    return {
      effects: [],
      activityEffects: []
    };
  }

  const effectDuration = spellEffectDuration(duration);
  const description = spellEffectDescription(spell, activity, Boolean(statuses.length));
  const effects = [];

  if (statuses.length) {
    for (const status of statuses) {
      const statusConfig = SPELL_STATUS_EFFECTS[status];
      effects.push(buildActiveEffect({
        documentId,
        packName: PACK_CONFIG.spells.packName,
        documentName: statusConfig?.name || capitalizeWords(status),
        img: statusConfig?.img || img,
        changes: [],
        seed: `spell-status|${status}`,
        transfer: false,
        description,
        statuses: [status],
        duration: effectDuration
      }));
    }
  } else {
    effects.push(buildActiveEffect({
      documentId,
      packName: PACK_CONFIG.spells.packName,
      documentName: effectNameForSpell(spell.name),
      img,
      changes: [],
      seed: 'spell-rider',
      transfer: false,
      description,
      duration: effectDuration
    }));
  }

  return {
    effects,
    activityEffects: effects.map((effect) => ({
      _id: effect._id,
      ...(activity.type === 'save' ? { onSave: false } : {})
    }))
  };
}

function parseActivation(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return { type: '', value: null, condition: '' };
  const match = raw.match(/^(\d+)\s+(.+)$/i);
  const amount = match ? safeNumber(match[1], 1) : 1;
  const unit = (match ? match[2] : raw).trim().toLowerCase();

  if (unit.includes('bonus')) return { type: 'bonus', value: amount, condition: '' };
  if (unit.includes('reaction')) return { type: 'reaction', value: amount, condition: '' };
  if (unit.includes('minute')) return { type: 'minute', value: amount, condition: '' };
  if (unit.includes('hour')) return { type: 'hour', value: amount, condition: '' };
  if (unit.includes('action')) return { type: 'action', value: amount, condition: '' };
  if (unit.includes('turn')) return { type: 'special', value: amount, condition: raw };
  if (unit === 'special') return { type: 'special', value: null, condition: '' };
  return { type: '', value: amount, condition: raw };
}

function parseDuration(text = '') {
  const raw = String(text || '').trim();
  if (!raw) {
    return {
      value: '',
      units: '',
      concentration: false,
      special: ''
    };
  }

  const concentration = /^concentration/i.test(raw);
  const normalized = raw.replace(/^concentration,\s*/i, '').replace(/^up to\s*/i, '').trim();
  if (/instant/i.test(normalized)) {
    return {
      value: '',
      units: 'inst',
      concentration,
      special: ''
    };
  }

  const match = normalized.match(/^(\d+)\s+(round|rounds|turn|turns|minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/i);
  if (match) {
    return {
      value: match[1],
      units: normalizeDurationUnit(match[2]),
      concentration,
      special: ''
    };
  }

  return {
    value: '',
    units: '',
    concentration,
    special: normalized
  };
}

function normalizeDurationUnit(unit = '') {
  const normalized = String(unit).toLowerCase();
  if (normalized.startsWith('round')) return 'round';
  if (normalized.startsWith('turn')) return 'turn';
  if (normalized.startsWith('minute')) return 'minute';
  if (normalized.startsWith('hour')) return 'hour';
  if (normalized.startsWith('day')) return 'day';
  if (normalized.startsWith('week')) return 'week';
  if (normalized.startsWith('month')) return 'month';
  if (normalized.startsWith('year')) return 'year';
  return '';
}

function parseRange(text = '') {
  const raw = String(text || '').trim();
  const range = {
    value: '',
    long: '',
    units: '',
    special: ''
  };
  const target = {
    affects: {
      choice: false,
      count: '',
      type: '',
      special: ''
    },
    template: {
      count: '',
      contiguous: false,
      type: '',
      size: '',
      width: '',
      height: '',
      units: ''
    }
  };

  if (!raw) {
    return { range, target };
  }

  if (/^self\b/i.test(raw)) {
    range.units = 'self';
    const templateMatch = raw.match(/\(([^)]+)\)/);
    if (templateMatch) {
      applyTemplateShape(target.template, templateMatch[1]);
    }
    return { range, target };
  }

  if (/^touch$/i.test(raw)) {
    range.units = 'touch';
    return { range, target };
  }

  const splitRange = raw.match(/^(\d+)\s*\/\s*(\d+)\s*(feet|foot|ft)?$/i);
  if (splitRange) {
    range.value = splitRange[1];
    range.long = splitRange[2];
    range.units = 'ft';
    return { range, target };
  }

  const feetMatch = raw.match(/^(\d+)\s*(feet|foot|ft)$/i);
  if (feetMatch) {
    range.value = feetMatch[1];
    range.units = 'ft';
    return { range, target };
  }

  if (/sight/i.test(raw)) {
    range.units = 'spec';
    range.special = raw;
    return { range, target };
  }

  if (/special/i.test(raw)) {
    range.units = 'spec';
    range.special = raw;
    return { range, target };
  }

  range.units = 'spec';
  range.special = raw;
  return { range, target };
}

function applyTemplateShape(template, shapeText = '') {
  const raw = String(shapeText || '').trim().toLowerCase();
  const shapeMap = {
    cone: 'cone',
    cube: 'cube',
    cylinder: 'cylinder',
    line: 'line',
    radius: 'radius',
    sphere: 'sphere'
  };

  const sizeMatch = raw.match(/(\d+)[-\s]*(foot|feet|ft)/);
  if (sizeMatch) {
    template.size = sizeMatch[1];
    template.units = 'ft';
  }

  for (const [token, type] of Object.entries(shapeMap)) {
    if (raw.includes(token)) {
      template.type = type;
      break;
    }
  }
}

function parseComponents(text = '') {
  const raw = String(text || '').trim();
  const properties = [];
  const materials = {
    value: '',
    consumed: false,
    cost: 0,
    supply: 0
  };

  if (!raw) {
    return { properties, materials };
  }

  if (/\bV\b/i.test(raw)) properties.push('vocal');
  if (/\bS\b/i.test(raw)) properties.push('somatic');
  if (/\bM\b/i.test(raw)) properties.push('material');

  const materialMatch = raw.match(/M\s*\(([^)]+)\)/i);
  if (materialMatch) {
    materials.value = materialMatch[1].trim();
  }

  return { properties, materials };
}

function formulaToPart(formula = '', forcedType = '') {
  const raw = String(formula || '').trim();
  const match = raw.match(/^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match) {
    return {
      number: null,
      denomination: null,
      bonus: '',
      types: forcedType ? [forcedType] : [],
      custom: {
        enabled: true,
        formula: raw
      },
      scaling: {
        mode: '',
        number: null,
        formula: ''
      }
    };
  }

  const sign = match[3] === '-' ? '-' : '';
  const bonus = match[4] ? `${sign}${match[4]}` : '';
  return {
    number: safeNumber(match[1], null),
    denomination: safeNumber(match[2], null),
    bonus,
    types: forcedType ? [forcedType] : [],
    custom: {
      enabled: false,
      formula: ''
    },
    scaling: {
      mode: '',
      number: null,
      formula: ''
    }
  };
}

function normalizeDamageType(codeOrWord = '') {
  const raw = String(codeOrWord || '').trim();
  if (!raw) return '';
  if (DAMAGE_TYPE_MAP[raw]) return DAMAGE_TYPE_MAP[raw];
  const lower = raw.toLowerCase();
  return WORD_DAMAGE_TYPE_MAP[lower] || '';
}

function detectSaveAbility(text = '') {
  const match = String(text).match(/\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+saving throw\b/i);
  if (!match) return '';
  return SAVE_MAP[capitalizeWords(match[1])] || '';
}

function detectAttackType(text = '') {
  const raw = String(text).toLowerCase();
  if (raw.includes('ranged spell attack')) return 'ranged';
  if (raw.includes('melee spell attack')) return 'melee';
  if (raw.includes('ranged weapon attack')) return 'ranged';
  if (raw.includes('melee weapon attack')) return 'melee';
  return '';
}

function detectOnSave(text = '') {
  const raw = String(text).toLowerCase();
  if (raw.includes('half as much damage on a successful')) return 'half';
  if (raw.includes('no damage on a successful')) return 'none';
  return '';
}

function extractDamageTypeFromDescription(description = '', fallbackText = '') {
  const combined = `${description} ${fallbackText}`.toLowerCase();
  for (const key of Object.keys(WORD_DAMAGE_TYPE_MAP)) {
    if (combined.includes(key)) {
      return WORD_DAMAGE_TYPE_MAP[key];
    }
  }
  return '';
}

function deriveSpellActivity(spell) {
  const descriptionText = spell.descriptionText || '';
  const saveAbility = detectSaveAbility(descriptionText);
  const attackType = detectAttackType(descriptionText);
  const baseRoll = pickPrimaryRoll(spell.rolls);
  const damageType = extractDamageTypeFromDescription(baseRoll?.description || '', descriptionText);
  const basePart = baseRoll ? formulaToPart(baseRoll.formula, damageType) : null;
  const scaling = parseSpellScaling(descriptionText, basePart);
  const rangeData = parseRange(spell.range);
  const activation = parseActivation(spell.time);
  const duration = parseDuration(spell.duration);

  if (saveAbility || basePart) {
    const activityType = saveAbility ? 'save' : (attackType ? 'attack' : 'utility');
    const activity = buildBaseActivity(activityType, activation, duration, rangeData);

    if (attackType) {
      activity.attack = {
        ability: '',
        bonus: '',
        critical: { threshold: null },
        flat: false,
        type: {
          value: attackType,
          classification: 'spell'
        }
      };
    }

    if (saveAbility) {
      activity.save = {
        ability: saveAbility,
        dc: {
          calculation: 'spellcasting',
          formula: ''
        }
      };
      if (basePart) {
        activity.damage = {
          onSave: detectOnSave(descriptionText),
          parts: [
            applyScaling(basePart, scaling)
          ]
        };
      }
      return activity;
    }

    if (basePart) {
      activity.damage = {
        critical: { bonus: '' },
        includeBase: false,
        parts: [applyScaling(basePart, scaling)]
      };
    }

    return activity;
  }

  if (/regain[s]? [^.\n]*hit points/i.test(descriptionText)) {
    const healRoll = baseRoll || spell.rolls.find((entry) => /heal/i.test(entry.description));
    const healingPart = healRoll ? formulaToPart(healRoll.formula, 'healing') : null;
    if (healingPart) {
      const activity = buildBaseActivity('heal', activation, duration, rangeData);
      activity.target.affects = {
        count: '1',
        type: 'creature',
        choice: false,
        special: ''
      };
      activity.healing = applyScaling(healingPart, parseSpellScaling(descriptionText, healingPart));
      return activity;
    }
  }

  return buildBaseActivity('utility', activation, duration, rangeData);
}

function parseSpellScaling(text = '', basePart = null) {
  const raw = String(text || '');
  const bySlotMatch = raw.match(/increase[s]? by (\d+)d(\d+) for each slot level above/i);
  if (bySlotMatch && basePart) {
    return {
      mode: 'whole',
      number: safeNumber(bySlotMatch[1], null),
      denomination: safeNumber(bySlotMatch[2], null)
    };
  }

  return {
    mode: '',
    number: null,
    denomination: null
  };
}

function applyScaling(part, scaling) {
  if (!part) return null;
  const clone = JSON.parse(JSON.stringify(part));
  if (scaling?.mode && scaling?.number && scaling?.denomination) {
    clone.scaling = {
      mode: scaling.mode,
      number: scaling.number,
      formula: ''
    };
  }
  return clone;
}

function pickPrimaryRoll(rolls = []) {
  if (!Array.isArray(rolls) || !rolls.length) return null;
  const withoutLevel = rolls.find((entry) => !entry.level);
  if (withoutLevel) return withoutLevel;
  return [...rolls].sort((left, right) => (left.level || 0) - (right.level || 0))[0] || null;
}

function buildBaseActivity(type, activation, duration, rangeData) {
  const activity = {
    _id: 'dnd5eactivity000',
    type,
    activation: {
      type: activation.type,
      value: activation.value,
      condition: activation.condition || '',
      override: false
    },
    consumption: {
      targets: [],
      scaling: {
        allowed: false,
        max: ''
      },
      spellSlot: true
    },
    description: {
      chatFlavor: ''
    },
    duration: {
      concentration: Boolean(duration.concentration),
      value: duration.value || '',
      units: duration.units || '',
      special: duration.special || '',
      override: false
    },
    effects: [],
    range: {
      value: rangeData.range.value || '',
      long: rangeData.range.long || '',
      units: rangeData.range.units || '',
      special: rangeData.range.special || '',
      override: false
    },
    target: {
      prompt: true,
      template: {
        count: rangeData.target.template.count || '',
        contiguous: rangeData.target.template.contiguous || false,
        type: rangeData.target.template.type || '',
        size: rangeData.target.template.size || '',
        width: rangeData.target.template.width || '',
        height: rangeData.target.template.height || '',
        units: rangeData.target.template.units || ''
      },
      affects: {
        count: rangeData.target.affects.count || '',
        type: rangeData.target.affects.type || '',
        choice: rangeData.target.affects.choice || false,
        special: rangeData.target.affects.special || ''
      },
      override: false
    },
    uses: {
      spent: 0,
      recovery: [],
      max: ''
    },
    sort: 0
  };

  if (type === 'utility') {
    activity.roll = {
      formula: '',
      name: '',
      prompt: false,
      visible: false
    };
  }

  if (type === 'heal') {
    activity.visibility = {
      requireMagic: false,
      level: {
        min: null,
        max: null
      },
      identifier: ''
    };
    activity.appliedEffects = [];
  }

  return activity;
}

function normalizeSpell(spell) {
  const sourceSplit = splitSourceText(spell.text, {
    name: spell.name,
    identifier: trimSlugToken(spell.name)
  });
  return {
    ...spell,
    descriptionText: sourceSplit.content || spell.text,
    source: sourceSplit.source,
    sourceLine: sourceSplit.sourceLine
  };
}

function isFeatureLikeSpell(spell) {
  return safeNumber(spell.level, 0) === 0
    && !normalizeWhitespace(spell.school)
    && !normalizeWhitespace(spell.time)
    && !normalizeWhitespace(spell.range)
    && !normalizeWhitespace(spell.components)
    && !normalizeWhitespace(spell.duration);
}

function spellFeatureIdSeed(normalized) {
  return [
    'spell',
    normalized.name,
    normalized.source.book,
    normalized.source.page,
    normalized.level,
    normalized.classes,
    normalized.time,
    normalized.range,
    normalized.duration,
    normalized.components,
    normalized.descriptionText,
    JSON.stringify(normalized.rolls)
  ].join('|');
}

function convertSpell(spell) {
  const normalized = normalizeSpell(spell);
  const identifier = trimSlugToken(normalized.name) || 'spell';
  const idSeed = spellFeatureIdSeed(normalized);
  const id = deterministicId(idSeed);
  const rangeData = parseRange(normalized.range);
  const duration = parseDuration(normalized.duration);
  const activation = parseActivation(normalized.time);
  const components = parseComponents(normalized.components);
  const activity = deriveSpellActivity(normalized);
  const modifierEffectData = buildDocumentEffects({
    modifiers: normalized.modifiers,
    documentId: id,
    packName: PACK_CONFIG.spells.packName,
    documentName: normalized.name,
    img: ITEM_ICON_MAP.spell,
    transfer: false,
    duration: spellEffectDuration(duration)
  });
  const riderEffectData = buildSpellRiderEffects({
    spell: normalized,
    activity,
    duration,
    documentId: id,
    img: ITEM_ICON_MAP.spell
  });
  activity.effects = [
    ...riderEffectData.activityEffects,
    ...modifierEffectData.effects.map((effect) => ({
      _id: effect._id,
      ...(activity.type === 'save' ? { onSave: false } : {})
    }))
  ];
  const system = {
    description: {
      value: textToHtml(normalized.descriptionText),
      chat: ''
    },
    source: normalized.source,
    activation: {
      type: activation.type,
      condition: activation.condition || '',
      value: activation.value
    },
    duration: {
      value: duration.value || '',
      units: duration.units || '',
      special: duration.special || ''
    },
    target: {
      affects: rangeData.target.affects,
      template: rangeData.target.template
    },
    range: {
      value: rangeData.range.value || '',
      units: rangeData.range.units || '',
      special: rangeData.range.special || ''
    },
    uses: {
      max: '',
      recovery: [],
      spent: 0
    },
    level: normalized.level,
    school: SPELL_SCHOOL_MAP[normalized.school] || '',
    materials: components.materials,
    preparation: {
      mode: 'prepared',
      prepared: false
    },
    properties: [
      ...components.properties,
      ...(normalized.ritual ? ['ritual'] : [])
    ],
    activities: {
      dnd5eactivity000: activity
    },
    identifier
  };

  return normalizeDocumentBase({
    id,
    name: normalized.name,
    type: 'spell',
    img: ITEM_ICON_MAP.spell,
    system,
    effects: [...modifierEffectData.effects, ...riderEffectData.effects],
    flags: buildSourceFlags({
      ...normalized,
      raw: spell
    }, 'spell', modifierEffectData.unmapped.length ? { unmappedModifiers: modifierEffectData.unmapped } : {})
  });
}

function convertFeatureLikeSpell(spell) {
  const normalized = normalizeSpell(spell);
  const id = deterministicId(spellFeatureIdSeed(normalized));
  const identifier = trimSlugToken(normalized.name) || 'feature';
  const activation = detectFeatureActivation(normalized.descriptionText);
  const effectData = buildDocumentEffects({
    modifiers: normalized.modifiers,
    documentId: id,
    packName: PACK_CONFIG.features.packName,
    documentName: normalized.name,
    img: ITEM_ICON_MAP.feat,
    disabled: Boolean(activation.type)
  });
  const activities = {};

  if (activation.type) {
    activities.dnd5eactivity000 = buildBaseActivity('utility', {
      type: activation.type,
      value: activation.value,
      condition: ''
    }, {
      value: '',
      units: '',
      concentration: false,
      special: ''
    }, {
      range: {
        value: '',
        long: '',
        units: 'self',
        special: ''
      },
      target: {
        affects: {
          count: '',
          type: 'self',
          choice: false,
          special: ''
        },
        template: {
          count: '',
          contiguous: false,
          type: '',
          size: '',
          width: '',
          height: '',
          units: ''
        }
      }
    });
  }

  return normalizeDocumentBase({
    id,
    name: normalized.name,
    type: 'feat',
    img: ITEM_ICON_MAP.feat,
    system: {
      description: {
        value: textToHtml(normalized.descriptionText),
        chat: ''
      },
      source: normalized.source,
      uses: {
        max: '',
        recovery: [],
        spent: 0
      },
      type: {
        value: 'class',
        subtype: ''
      },
      requirements: normalized.classes || '',
      properties: [],
      activities,
      enchant: {},
      prerequisites: {
        level: null
      },
      identifier
    },
    effects: effectData.effects,
    flags: buildSourceFlags({
      ...normalized,
      raw: spell
    }, 'feature', effectData.unmapped.length ? { unmappedModifiers: effectData.unmapped } : {})
  });
}

function parseRarity(detail = '') {
  const normalized = String(detail).toLowerCase();
  const rarities = ['common', 'uncommon', 'rare', 'very rare', 'legendary', 'artifact'];
  return rarities.find((rarity) => normalized.includes(rarity)) || '';
}

function parseAttunement(detail = '', text = '') {
  const combined = `${detail} ${text}`.toLowerCase();
  return combined.includes('requires attunement') ? 'required' : '';
}

function mapArmorType(entry) {
  return ARMOR_CATEGORY_MAP[entry.typeCode] || '';
}

function mapWeaponTypeValue(entry) {
  const baseDetail = String(entry.detail || '').toLowerCase();
  const martial = /\bmartial\b/i.test(baseDetail) || String(entry.property || '').split(',').map((token) => token.trim()).includes('M');
  const simple = !martial;
  if (entry.typeCode === 'R') return simple ? 'simpleR' : 'martialR';
  return simple ? 'simpleM' : 'martialM';
}

function mapBaseItem(entry) {
  const detail = String(entry.detail || '').trim();
  if (!detail) return trimSlugToken(entry.name);
  const prefix = detail.split(',')[0].trim();
  return trimSlugToken(prefix || entry.name);
}

function parseItemProperties(entry) {
  return String(entry.property || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => ITEM_PROPERTY_MAP[token])
    .filter(Boolean);
}

function parsePrice(value) {
  const amount = safeNumber(value, 0);
  return {
    value: amount,
    denomination: 'gp'
  };
}

function parseWeight(value) {
  return {
    value: safeNumber(value, 0),
    units: 'lb'
  };
}

function parseItemRange(entry) {
  const raw = String(entry.range || '').trim();
  if (!raw) {
    return {
      value: '',
      long: '',
      units: '',
      reach: null
    };
  }

  const match = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (match) {
    return {
      value: safeNumber(match[1], ''),
      long: safeNumber(match[2], ''),
      units: 'ft',
      reach: null
    };
  }

  const single = raw.match(/^(\d+)$/);
  if (single) {
    return {
      value: safeNumber(single[1], ''),
      long: '',
      units: 'ft',
      reach: null
    };
  }

  return {
    value: '',
    long: '',
    units: '',
    reach: null
  };
}

function findAmmoType(text = '') {
  const match = String(text || '').match(/\bAmmo:\s*([A-Za-z -]+)/i);
  return trimSlugToken(match?.[1] || '');
}

function parseMagicalBonus(entry) {
  const modifierTexts = entry.modifiers.map((modifier) => modifier.value);
  const candidates = [
    ...modifierTexts,
    entry.text,
    entry.detail
  ];

  for (const value of candidates) {
    const match = String(value || '').match(/\+(\d+)/);
    if (match) {
      return safeNumber(match[1], null);
    }
  }

  return null;
}

function buildWeaponActivity(entry, range, damageType) {
  const attackType = entry.typeCode === 'R' ? 'ranged' : 'melee';
  const thrown = parseItemProperties(entry).includes('thr');
  const activity = buildBaseActivity('attack', {
    type: 'action',
    value: 1,
    condition: ''
  }, {
    value: '',
    units: '',
    concentration: false,
    special: ''
  }, {
    range: {
      value: range.value || '',
      long: range.long || '',
      units: range.units || '',
      special: ''
    },
    target: {
      affects: {
        choice: false,
        count: '',
        type: '',
        special: ''
      },
      template: {
        count: '',
        contiguous: false,
        type: '',
        size: '',
        width: '',
        height: '',
        units: ''
      }
    }
  });

  activity.attack = {
    ability: '',
    bonus: '',
    critical: {
      threshold: null
    },
    flat: false,
    type: {
      value: thrown && attackType === 'melee' ? 'ranged' : attackType,
      classification: 'weapon'
    }
  };
  activity.damage = {
    critical: { bonus: '' },
    includeBase: true,
    parts: []
  };

  if (damageType) {
    activity.description.chatFlavor = damageType;
  }

  return activity;
}

function buildEquipmentActivity(entry) {
  const description = String(entry.text || '').toLowerCase();
  const activationType = description.includes('bonus action')
    ? 'bonus'
    : description.includes('reaction')
      ? 'reaction'
      : description.includes('action')
        ? 'action'
        : '';

  if (!activationType && !entry.rolls.length) {
    return {};
  }

  const activity = buildBaseActivity('utility', {
    type: activationType,
    value: activationType ? 1 : null,
    condition: ''
  }, {
    value: '',
    units: '',
    concentration: false,
    special: ''
  }, {
    range: {
      value: '',
      long: '',
      units: '',
      special: ''
    },
    target: {
      affects: {
        choice: false,
        count: '',
        type: '',
        special: ''
      },
      template: {
        count: '',
        contiguous: false,
        type: '',
        size: '',
        width: '',
        height: '',
        units: ''
      }
    }
  });

  const healingRoll = entry.rolls.find((roll) => /healing/i.test(roll.description));
  if (healingRoll) {
    activity.type = 'heal';
    activity.healing = formulaToPart(healingRoll.formula, 'healing');
    activity.target.affects = {
      count: '1',
      type: 'creature',
      choice: false,
      special: ''
    };
    activity.visibility = {
      requireMagic: Boolean(entry.magic),
      level: {
        min: null,
        max: null
      },
      identifier: ''
    };
    activity.appliedEffects = [];
  }

  if (entry.rolls.length && !healingRoll) {
    const damageRoll = pickPrimaryRoll(entry.rolls);
    if (damageRoll) {
      activity.type = 'damage';
      activity.damage = {
        critical: { bonus: '' },
        includeBase: false,
        parts: [
          formulaToPart(damageRoll.formula, extractDamageTypeFromDescription(damageRoll.description, entry.text))
        ]
      };
    }
  }

  return {
    dnd5eactivity000: activity
  };
}

function normalizeItem(entry) {
  const sourceSplit = splitSourceText(entry.text, {
    name: entry.name,
    identifier: trimSlugToken(entry.name)
  });
  return {
    ...entry,
    descriptionText: sourceSplit.content || entry.text,
    source: sourceSplit.source,
    sourceLine: sourceSplit.sourceLine
  };
}

function convertItem(item) {
  const normalized = normalizeItem(item);
  const documentType = ITEM_TYPE_MAP[normalized.typeCode] || 'loot';
  const idSeed = [
    'item',
    normalized.name,
    normalized.source.book,
    normalized.source.page,
    normalized.detail,
    normalized.typeCode,
    normalized.property,
    normalized.dmg1,
    normalized.dmg2,
    normalized.range,
    normalized.descriptionText,
    JSON.stringify(normalized.modifiers),
    JSON.stringify(normalized.rolls)
  ].join('|');
  const id = deterministicId(idSeed);
  const identifier = trimSlugToken(normalized.name) || 'item';
  const rarity = parseRarity(normalized.detail);
  const attunement = parseAttunement(normalized.detail, normalized.descriptionText);
  const magicalBonus = parseMagicalBonus(normalized);
  const baseItem = mapBaseItem(normalized);
  const properties = parseItemProperties(normalized);
  const damageType = normalizeDamageType(normalized.dmgType);
  const range = parseItemRange(normalized);
  const price = parsePrice(normalized.value);
  const weight = parseWeight(normalized.weight);

  const commonFields = {
    description: {
      value: textToHtml(normalized.descriptionText),
      chat: ''
    },
    source: normalized.source,
    quantity: 1,
    weight,
    price,
    attunement,
    equipped: false,
    rarity,
    identified: true,
    uses: {
      max: '',
      recovery: [],
      spent: 0
    },
    unidentified: {
      description: ''
    },
    container: null,
    properties: normalized.magic ? [...new Set([...properties, 'mgc'])] : properties,
    magicalBonus,
    activities: {},
    attuned: false,
    identifier
  };

  let system;
  if (documentType === 'weapon') {
    system = {
      ...commonFields,
      cover: null,
      range,
      damage: {
        versatile: normalized.dmg2 ? formulaToPart(normalized.dmg2, damageType) : {
          number: null,
          denomination: null,
          bonus: '',
          types: [],
          custom: {
            enabled: false,
            formula: ''
          },
          scaling: {
            mode: '',
            number: null,
            formula: ''
          }
        },
        base: normalized.dmg1 ? formulaToPart(normalized.dmg1, damageType) : {
          number: null,
          denomination: null,
          bonus: '',
          types: [],
          custom: {
            enabled: false,
            formula: ''
          },
          scaling: {
            mode: '',
            number: null,
            formula: ''
          }
        }
      },
      armor: {
        value: 10
      },
      hp: {
        value: 0,
        max: 0,
        dt: null,
        conditions: ''
      },
      proficient: null,
      type: {
        value: mapWeaponTypeValue(normalized),
        baseItem
      },
      crewed: false,
      activities: {
        dnd5eactivity000: buildWeaponActivity(normalized, range, damageType)
      },
      ammunition: {
        type: findAmmoType(normalized.descriptionText)
      },
      mastery: ''
    };
  } else if (documentType === 'equipment') {
    const armorCategory = mapArmorType(normalized);
    system = {
      ...commonFields,
      cover: null,
      armor: {
        value: safeNumber(normalized.ac, 10),
        dex: armorCategory === 'heavy' ? 0 : null,
        magicalBonus
      },
      hp: {
        value: 0,
        max: 0,
        dt: null,
        conditions: ''
      },
      speed: {
        value: null,
        conditions: ''
      },
      strength: armorCategory === 'heavy' ? 13 : null,
      proficient: null,
      type: {
        value: armorCategory || (normalized.typeCode === 'S' ? 'shield' : 'equipment'),
        baseItem
      },
      crewed: false,
      activities: buildEquipmentActivity(normalized)
    };
  } else if (documentType === 'consumable') {
    const healingRoll = normalized.rolls.find((roll) => /healing/i.test(roll.description));
    system = {
      ...commonFields,
      uses: {
        max: healingRoll ? '1' : '',
        recovery: [],
        autoDestroy: Boolean(healingRoll),
        spent: 0
      },
      damage: healingRoll ? {
        base: formulaToPart(healingRoll.formula, 'healing'),
        replace: false
      } : undefined,
      type: {
        value: CONSUMABLE_TYPE_MAP[normalized.typeCode] || 'trinket',
        subtype: ''
      },
      activities: buildEquipmentActivity(normalized)
    };
  } else if (documentType === 'loot') {
    system = {
      ...commonFields,
      type: {
        value: 'loot',
        subtype: ''
      }
    };
  } else {
    system = {
      ...commonFields,
      type: {
        value: documentType,
        subtype: ''
      }
    };
  }

  const effectData = buildDocumentEffects({
    modifiers: normalized.modifiers,
    documentId: id,
    packName: PACK_CONFIG.items.packName,
    documentName: normalized.name,
    img: ITEM_ICON_MAP[documentType] || ITEM_ICON_MAP.equipment
  });

  return normalizeDocumentBase({
    id,
    name: normalized.name,
    type: documentType,
    img: ITEM_ICON_MAP[documentType] || ITEM_ICON_MAP.equipment,
    system,
    effects: effectData.effects,
    flags: buildSourceFlags({
      ...normalized,
      raw: item
    }, 'item', effectData.unmapped.length ? { unmappedModifiers: effectData.unmapped } : {})
  });
}

function splitCsvList(value = '') {
  return String(value || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !/^none$/i.test(part));
}

function normalizeAbilityLabel(value = '') {
  return capitalizeWords(String(value || '').trim().toLowerCase());
}

function capitalizeWords(value = '') {
  return String(value || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

function buildTraitAdvancement({ id = '', grants = [], choices = [], level = 1, classRestriction = null, mode = 'default', title = '' }) {
  const advancement = {
    _id: id || deterministicId(['trait', level, grants.join(','), JSON.stringify(choices)].join('|')),
    type: 'Trait',
    configuration: {
      mode,
      allowReplacements: false,
      grants,
      choices
    },
    level,
    title,
    value: {
      chosen: []
    }
  };

  if (classRestriction) {
    advancement.classRestriction = classRestriction;
  }

  return advancement;
}

function buildItemChoiceAdvancement({ id = '', title, choices, hint = '' }) {
  const advancement = {
    _id: id || deterministicId(['item-choice', title, JSON.stringify(choices)].join('|')),
    type: 'ItemChoice',
    configuration: {
      choices,
      allowDrops: true,
      type: 'spell',
      pool: [],
      spell: {
        ability: [],
        preparation: '',
        uses: {
          max: '',
          per: ''
        }
      },
      restriction: {
        type: '',
        subtype: '',
        level: 'available'
      }
    },
    value: {
      added: {},
      replaced: {}
    },
    title
  };

  if (hint) {
    advancement.hint = hint;
  }

  return advancement;
}

function buildItemGrantAdvancement(level, uuids) {
  return {
    _id: deterministicId(['item-grant', level, uuids.join(',')].join('|')),
    type: 'ItemGrant',
    configuration: {
      items: uuids.map((uuid) => ({
        uuid,
        optional: false
      })),
      optional: false,
      spell: {
        ability: [],
        preparation: '',
        uses: {
          max: '',
          per: ''
        }
      }
    },
    value: {},
    level,
    title: 'Features'
  };
}

function buildAbilityScoreImprovement(level) {
  return {
    _id: deterministicId(`asi|${level}`),
    type: 'AbilityScoreImprovement',
    configuration: {
      points: 2,
      fixed: {
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0
      },
      cap: 2,
      locked: []
    },
    value: {},
    level,
    title: level === 19 ? '' : 'Ability Score Improvement'
  };
}

function buildSkillChoicePool(skills = []) {
  const uniqueSkills = Array.from(new Set(skills));
  const allSkills = Object.values(SKILL_MAP);
  if (allSkills.every((skill) => uniqueSkills.includes(skill))) {
    return ['skills:*'];
  }
  return uniqueSkills.map((skill) => `skills:${skill}`);
}

function buildScaleValueAdvancement({ id = '', title, identifier, type, distanceUnits = '', scale }) {
  return {
    _id: id || deterministicId(['scale-value', identifier, title, JSON.stringify(scale)].join('|')),
    type: 'ScaleValue',
    configuration: {
      identifier,
      type,
      distance: {
        units: distanceUnits
      },
      scale
    },
    value: {},
    title
  };
}

function buildDiceScaleValueAdvancement({ id, title, identifier, entries }) {
  return buildScaleValueAdvancement({
    id,
    title,
    identifier,
    type: 'dice',
    scale: Object.fromEntries(entries.map(({ level, number, faces }) => [
      String(level),
      {
        number: number ?? null,
        faces,
        modifiers: []
      }
    ]))
  });
}

function buildValueScaleAdvancement({ id, title, identifier, type = 'number', distanceUnits = '', entries }) {
  return buildScaleValueAdvancement({
    id,
    title,
    identifier,
    type,
    distanceUnits,
    scale: Object.fromEntries(entries.map(({ level, value }) => [
      String(level),
      { value }
    ]))
  });
}

function buildNumberScaleValueAdvancement({ id, title, identifier, entries }) {
  return buildValueScaleAdvancement({
    id,
    title,
    identifier,
    type: 'number',
    entries
  });
}

function buildSubclassAdvancement(level, title) {
  return {
    _id: deterministicId(`subclass|${level}|${title}`),
    type: 'Subclass',
    configuration: {},
    value: {},
    level,
    title
  };
}

function inferSpellcastingProgression(classEntry) {
  const identifier = trimSlugToken(classEntry.name);
  if (SPELLCASTING_PROGRESSION_OVERRIDES[identifier]) {
    return SPELLCASTING_PROGRESSION_OVERRIDES[identifier];
  }

  const slotRows = classEntry.autolevels
    .map((autolevel) => autolevel.slots)
    .filter((slots) => Array.isArray(slots) && slots.length);

  if (!slotRows.length) {
    return 'none';
  }

  if (String(classEntry.slotsReset || '').toUpperCase() !== 'L') {
    return 'pact';
  }

  const maxColumns = Math.max(...slotRows.map((slots) => slots.length));
  const firstSpellLevel = classEntry.autolevels.find((autolevel) => autolevel.slots.length)?.level || 1;

  if (maxColumns >= 10) return 'full';
  if (maxColumns >= 6) return firstSpellLevel <= 1 ? 'full' : 'half';
  if (maxColumns >= 2) {
    if (firstSpellLevel >= 3) return 'third';
    if (firstSpellLevel === 2) return 'half';
    return 'full';
  }
  return 'none';
}

function inferPrimaryAbility(classEntry, spellAbilityCode) {
  const identifier = trimSlugToken(classEntry.name);
  if (spellAbilityCode) {
    return {
      value: [spellAbilityCode],
      all: false
    };
  }

  if (PRIMARY_ABILITY_OVERRIDES[identifier]) {
    return {
      value: PRIMARY_ABILITY_OVERRIDES[identifier],
      all: false
    };
  }

  return {
    value: [],
    all: true
  };
}

function extractCounterValues(classEntry, counterName) {
  return classEntry.autolevels
    .map((autolevel) => ({
      level: safeNumber(autolevel.level, null),
      value: autolevel.counters
        ?.find((counter) => normalizeWhitespace(counter.name).toLowerCase() === counterName.toLowerCase())
        ?.value
    }))
    .filter((entry) => entry.level !== null && entry.value !== undefined)
    .map((entry) => ({
      level: entry.level,
      value: safeNumber(entry.value, null)
    }))
    .filter((entry) => entry.value !== null);
}

function extractChangedNumberEntries(entries) {
  let previous = Symbol('unset');
  return entries
    .slice()
    .sort((left, right) => left.level - right.level)
    .filter((entry) => {
      if (entry.value === previous) return false;
      previous = entry.value;
      return true;
    });
}

function hasClassFeature(classEntry, pattern) {
  return classEntry.autolevels
    .some((autolevel) => autolevel.features?.some((feature) => pattern.test(feature.name)));
}

function getFeatureEntries(classEntry, pattern) {
  const entries = [];
  for (const autolevel of classEntry.autolevels) {
    const level = safeNumber(autolevel.level, null);
    if (level === null) continue;
    for (const feature of autolevel.features || []) {
      if (pattern.test(feature.name)) {
        entries.push({ level, feature });
      }
    }
  }
  return entries;
}

function scaleId(classIdentifier, identifier) {
  return CLASS_SCALE_VALUE_IDS[classIdentifier]?.[identifier] || '';
}

function extractDieFacesFromText(value = '') {
  const dieMatch = String(value || '').match(/\bd(\d+)\b/i);
  if (dieMatch) return safeNumber(dieMatch[1], null);

  const percentMatch = String(value || '').match(/%(\d+)\b/);
  return percentMatch ? safeNumber(percentMatch[1], null) : null;
}

function parseOrdinalLevel(value = '') {
  const match = String(value || '').match(/\b(\d+)(?:st|nd|rd|th)?\b/i);
  return match ? safeNumber(match[1], null) : null;
}

function parseCountWord(value = '') {
  const text = String(value || '').toLowerCase();
  const digitMatch = text.match(/\b(\d+)\b/);
  if (digitMatch) return safeNumber(digitMatch[1], null);
  if (/\bone\b/.test(text) || /\ba\b/.test(text)) return 1;
  if (/\btwo\b/.test(text)) return 2;
  if (/\bthree\b/.test(text)) return 3;
  if (/\bfour\b/.test(text)) return 4;
  return null;
}

function parseCrValue(value = '') {
  const match = String(value || '').match(/\bCR\s+(\d+)(?:\/(\d+))?\b/i);
  if (!match) return null;
  const numerator = safeNumber(match[1], null);
  const denominator = safeNumber(match[2], null);
  if (numerator === null) return null;
  return denominator ? numerator / denominator : numerator;
}

function extractDiceEntriesFromFeatures(classEntry, pattern, options = {}) {
  const entries = [];
  for (const { level, feature } of getFeatureEntries(classEntry, pattern)) {
    const text = `${feature.name}\n${feature.text || ''}`;
    const dieMatch = text.match(/(\d+)?d(\d+)\b/i);
    if (dieMatch) {
      entries.push({
        level,
        number: dieMatch[1] ? safeNumber(dieMatch[1], null) : options.defaultNumber ?? null,
        faces: safeNumber(dieMatch[2], null)
      });
      continue;
    }

    const parentheticalCount = feature.name.match(/\(([^)]+)\)/);
    const number = parentheticalCount ? parseCountWord(parentheticalCount[1]) : null;
    if (number && options.faces) {
      entries.push({ level, number, faces: options.faces });
    }
  }
  return entries;
}

function extractTableDiceEntries(text = '') {
  const entries = [];
  for (const match of String(text || '').matchAll(/(\d+)(?:st|nd|rd|th)?\s*\|\s*(\d+)?d(\d+)\b/gi)) {
    entries.push({
      level: safeNumber(match[1], null),
      number: match[2] ? safeNumber(match[2], null) : null,
      faces: safeNumber(match[3], null)
    });
  }
  return entries.filter((entry) => entry.level !== null && entry.faces !== null);
}

function extractDistanceEntriesFromFeatures(classEntry, pattern) {
  const entries = [];
  for (const { level, feature } of getFeatureEntries(classEntry, pattern)) {
    const match = `${feature.name}\n${feature.text || ''}`.match(/\bincreases by\s+(\d+)\s+feet\b/i);
    if (match) entries.push({ level, value: safeNumber(match[1], null) });
  }
  return entries.filter((entry) => entry.value !== null);
}

function extractCantripsKnownEntries(classEntry) {
  return extractChangedNumberEntries(classEntry.autolevels
    .map((autolevel) => ({
      level: safeNumber(autolevel.level, null),
      value: safeNumber(autolevel.slots?.[0], null)
    }))
    .filter((entry) => entry.level !== null && entry.value !== null && entry.value > 0));
}

function buildCantripsKnownScaleValueAdvancement(classEntry, classIdentifier) {
  if (!CANTRIPS_KNOWN_CLASSES.has(classIdentifier)) return [];
  const cantripsKnown = extractCantripsKnownEntries(classEntry);
  if (!cantripsKnown.length) return [];

  return [buildNumberScaleValueAdvancement({
    id: scaleId(classIdentifier, 'cantrips-known'),
    title: 'Cantrips Known',
    identifier: 'cantrips-known',
    entries: cantripsKnown
  })];
}

function buildSpellsKnownScaleValueAdvancement(classEntry, classIdentifier) {
  if (!SPELLS_KNOWN_CLASSES.has(classIdentifier)) return [];
  const spellsKnown = extractChangedNumberEntries(extractCounterValues(classEntry, 'Spells Known'));
  if (!spellsKnown.length) return [];

  return [buildNumberScaleValueAdvancement({
    id: scaleId(classIdentifier, 'spells-known'),
    title: 'Spells Known',
    identifier: 'spells-known',
    entries: spellsKnown
  })];
}

function buildBardScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'bard') return [];

  const advancements = [];
  const inspiration = [];
  for (const { level, feature } of getFeatureEntries(classEntry, /^Bardic Inspiration(?:\s*\([^)]*\))?$/i)) {
    const autolevel = classEntry.autolevels.find((entry) => safeNumber(entry.level, null) === level);
    const counter = autolevel?.counters?.find((entry) => /^Bardic Inspiration$/i.test(entry.name));
    const faces = extractDieFacesFromText(feature.name) || extractDieFacesFromText(counter?.value) || (level === 1 ? 6 : null);
    if (faces) inspiration.push({ level, faces });
  }
  if (inspiration.length) advancements.push(buildDiceScaleValueAdvancement({
    id: scaleId(classIdentifier, 'inspiration'),
    title: 'Bardic Inspiration Die',
    identifier: 'inspiration',
    entries: inspiration
  }));

  const songOfRest = getFeatureEntries(classEntry, /^Song of Rest\s*\([^)]*\)$/i)
    .map(({ level, feature }) => ({ level, faces: extractDieFacesFromText(feature.name) }))
    .filter((entry) => entry.faces);
  if (songOfRest.length) advancements.push(buildDiceScaleValueAdvancement({
    id: scaleId(classIdentifier, 'song-of-rest'),
    title: 'Song of Rest Die',
    identifier: 'song-of-rest',
    entries: songOfRest
  }));

  return advancements;
}

function buildBarbarianScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'barbarian') return [];

  const rages = extractChangedNumberEntries(extractCounterValues(classEntry, 'Rage'));
  if (hasClassFeature(classEntry, /^Primal Champion$/i)) {
    rages.push({ level: 20, value: 999 });
  }

  const rageDamage = [];
  const rage = getFeatureEntries(classEntry, /^Rage$/i)[0]?.feature;
  if (rage) {
    for (const match of rage.text.matchAll(/(?:At\s+)?(\d+)(?:st|nd|rd|th)?(?:\s+level)?[^.]*?\+(\d+)\s+bonus to damage/gi)) {
      rageDamage.push({ level: safeNumber(match[1], null), value: safeNumber(match[2], null) });
    }
    for (const match of rage.text.matchAll(/\+(\d+)\s+at\s+(\d+)(?:st|nd|rd|th)?(?:\s+level)?/gi)) {
      rageDamage.push({ level: safeNumber(match[2], null), value: safeNumber(match[1], null) });
    }
  }

  const brutalCritical = getFeatureEntries(classEntry, /^Brutal Critical/i)
    .map(({ level, feature }) => ({
      level,
      value: parseCountWord(feature.name.match(/\(([^)]+)\)/)?.[1] || '')
    }))
    .filter((entry) => entry.value);

  return [
    rages.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'rages'),
      title: 'Rages',
      identifier: 'rages',
      entries: extractChangedNumberEntries(rages)
    }) : null,
    rageDamage.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'rage-damage'),
      title: 'Rage Damage',
      identifier: 'rage-damage',
      entries: extractChangedNumberEntries(rageDamage)
    }) : null,
    brutalCritical.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'brutal-critical'),
      title: 'Brutal Critical Dice',
      identifier: 'brutal-critical',
      entries: extractChangedNumberEntries(brutalCritical)
    }) : null
  ].filter(Boolean);
}

function buildClericScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'cleric') return [];

  const channelDivinity = extractChangedNumberEntries(extractCounterValues(classEntry, 'Channel Divinity'));
  const destroyUndead = getFeatureEntries(classEntry, /^Destroy Undead/i)
    .map(({ level, feature }) => ({ level, value: parseCrValue(feature.name) }))
    .filter((entry) => entry.value !== null);

  return [
    channelDivinity.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'channel-divinity'),
      title: 'Channel Divinity Uses',
      identifier: 'channel-divinity',
      entries: channelDivinity
    }) : null,
    destroyUndead.length ? buildValueScaleAdvancement({
      id: scaleId(classIdentifier, 'destroy-undead'),
      title: 'Destroy Undead CR',
      identifier: 'destroy-undead',
      type: 'cr',
      entries: destroyUndead
    }) : null
  ].filter(Boolean);
}

function buildDruidScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'druid') return [];

  const wildShapeUses = extractChangedNumberEntries(extractCounterValues(classEntry, 'Wild Shape'));
  if (hasClassFeature(classEntry, /^Archdruid$/i)) {
    wildShapeUses.push({ level: 20, value: 99 });
  }

  const wildShapeFeature = getFeatureEntries(classEntry, /^Wild Shape$/i)[0]?.feature;
  const wildShapeCr = [];
  if (wildShapeFeature) {
    for (const match of wildShapeFeature.text.matchAll(/(\d+)(?:st|nd|rd|th)?\s*\|\s*(\d+)(?:\/(\d+))?\s*\|/gi)) {
      const numerator = safeNumber(match[2], null);
      const denominator = safeNumber(match[3], null);
      if (numerator !== null) wildShapeCr.push({ level: safeNumber(match[1], null), value: denominator ? numerator / denominator : numerator });
    }
  }

  return [
    wildShapeCr.length ? buildValueScaleAdvancement({
      id: scaleId(classIdentifier, 'wild-shape'),
      title: 'Wild Shape CR',
      identifier: 'wild-shape',
      type: 'cr',
      entries: wildShapeCr
    }) : null,
    wildShapeUses.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'wild-shape-uses'),
      title: 'Wild Shape Uses',
      identifier: 'wild-shape-uses',
      entries: extractChangedNumberEntries(wildShapeUses)
    }) : null
  ].filter(Boolean);
}

function buildFighterScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'fighter') return [];

  const actionSurge = getFeatureEntries(classEntry, /^Action Surge/i)
    .map(({ level, feature }) => ({ level, value: parseCountWord(feature.name) || (level === 2 ? 1 : null) }))
    .filter((entry) => entry.value);
  const indomitable = getFeatureEntries(classEntry, /^Indomitable/i)
    .map(({ level, feature }) => ({ level, value: parseCountWord(feature.name) || (level === 9 ? 1 : null) }))
    .filter((entry) => entry.value);

  return [
    indomitable.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'indomitable'),
      title: 'Indomitable Uses',
      identifier: 'indomitable',
      entries: indomitable
    }) : null,
    actionSurge.length ? buildNumberScaleValueAdvancement({
      id: scaleId(classIdentifier, 'action-surge'),
      title: 'Action Surge Uses',
      identifier: 'action-surge',
      entries: actionSurge
    }) : null
  ].filter(Boolean);
}

function buildMonkScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'monk') return [];

  const martialArtsFeature = getFeatureEntries(classEntry, /^Martial Arts$/i)[0]?.feature;
  const martialArts = martialArtsFeature
    ? extractTableDiceEntries(martialArtsFeature.text).map((entry) => ({ ...entry, number: null }))
    : [];
  const movement = extractDistanceEntriesFromFeatures(classEntry, /^Unarmored Movement(?:\s|$)/i);

  return [
    martialArts.length ? buildDiceScaleValueAdvancement({
      id: scaleId(classIdentifier, 'die'),
      title: 'Martial Arts Die',
      identifier: 'die',
      entries: martialArts
    }) : null,
    movement.length ? buildValueScaleAdvancement({
      id: scaleId(classIdentifier, 'unarmored-movement'),
      title: 'Unarmored Movement',
      identifier: 'unarmored-movement',
      type: 'distance',
      distanceUnits: 'ft',
      entries: movement
    }) : null
  ].filter(Boolean);
}

function buildPaladinScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'paladin') return [];
  if (!hasClassFeature(classEntry, /^Aura of Protection$/i)) return [];

  return [buildValueScaleAdvancement({
    id: scaleId(classIdentifier, 'aura-radius'),
    title: 'Aura Radius',
    identifier: 'aura-radius',
    type: 'distance',
    distanceUnits: 'ft',
    entries: [
      { level: 6, value: 10 },
      { level: 18, value: 30 }
    ]
  })];
}

function buildRogueScaleValueAdvancements(classEntry, classIdentifier) {
  if (classIdentifier !== 'rogue') return [];

  const sneakAttack = extractDiceEntriesFromFeatures(classEntry, /^Sneak Attack/i, { faces: 6, defaultNumber: 1 })
    .filter((entry) => entry.faces);
  if (!sneakAttack.length) return [];

  return [buildDiceScaleValueAdvancement({
    id: scaleId(classIdentifier, 'sneak-attack'),
    title: 'Sneak Attack',
    identifier: 'sneak-attack',
    entries: sneakAttack
  })];
}

function buildExpertiseAdvancements(classEntry, classIdentifier) {
  if (!CLASS_EXPERTISE_IDS[classIdentifier]) return [];

  const expertiseLevels = classEntry.autolevels
    .filter((autolevel) => autolevel.features?.some((feature) => /^Expertise(?:\s+Improvement)?$/i.test(feature.name)))
    .map((autolevel) => safeNumber(autolevel.level, null))
    .filter((level) => level !== null);

  return expertiseLevels.map((level) => {
    const pool = classIdentifier === 'rogue' && level === 1
      ? ['tool:thief', 'skills:*']
      : classIdentifier === 'rogue'
        ? ['skills:*', 'tool:thief']
        : ['skills:*'];

    return buildTraitAdvancement({
      id: CLASS_EXPERTISE_IDS[classIdentifier][level] || '',
      grants: [],
      choices: [{
        count: 2,
        pool
      }],
      level,
      mode: 'expertise',
      title: 'Expertise'
    });
  });
}

function buildBardMagicalSecretsAdvancement(classEntry) {
  if (trimSlugToken(classEntry.name) !== 'bard') return [];

  const magicalSecretLevels = classEntry.autolevels
    .filter((autolevel) => autolevel.features?.some((feature) => /^Magical Secrets$/i.test(feature.name)))
    .map((autolevel) => safeNumber(autolevel.level, null))
    .filter((level) => level !== null);
  if (!magicalSecretLevels.length) return [];

  return [buildItemChoiceAdvancement({
    id: 'EC1yNAV6khHilOhz',
    title: 'Magical Secrets',
    choices: Object.fromEntries(magicalSecretLevels.map((level) => [
      String(level),
      {
        count: 2,
        replacement: false
      }
    ])),
    hint: 'Choose two spells from any classes, including this one. A spell you choose must be of a level you can cast, as shown on the Bard table, or a cantrip.'
  })];
}

function buildClassCompatibilityAdvancements(classEntry) {
  const classIdentifier = trimSlugToken(classEntry.name);
  return [
    ...buildExpertiseAdvancements(classEntry, classIdentifier),
    ...buildBardMagicalSecretsAdvancement(classEntry),
    ...buildCantripsKnownScaleValueAdvancement(classEntry, classIdentifier),
    ...buildSpellsKnownScaleValueAdvancement(classEntry, classIdentifier),
    ...buildBarbarianScaleValueAdvancements(classEntry, classIdentifier),
    ...buildBardScaleValueAdvancements(classEntry, classIdentifier),
    ...buildClericScaleValueAdvancements(classEntry, classIdentifier),
    ...buildDruidScaleValueAdvancements(classEntry, classIdentifier),
    ...buildFighterScaleValueAdvancements(classEntry, classIdentifier),
    ...buildMonkScaleValueAdvancements(classEntry, classIdentifier),
    ...buildPaladinScaleValueAdvancements(classEntry, classIdentifier),
    ...buildRogueScaleValueAdvancements(classEntry, classIdentifier)
  ];
}

function parseSkillAndSaveData(proficiencyText = '') {
  const parts = splitCsvList(proficiencyText);
  const saves = [];
  const skills = [];

  parts.forEach((part) => {
    if (SAVE_MAP[part]) {
      saves.push(SAVE_MAP[part]);
      return;
    }

    if (SKILL_MAP[part]) {
      skills.push(SKILL_MAP[part]);
    }
  });

  return { saves, skills };
}

function parseArmorGrants(text = '') {
  return splitCsvList(text)
    .map((entry) => {
      if (/light armor/i.test(entry)) return 'armor:lgt';
      if (/medium armor/i.test(entry)) return 'armor:med';
      if (/heavy armor/i.test(entry)) return 'armor:hvy';
      if (/shield/i.test(entry)) return 'armor:shl';
      return '';
    })
    .filter(Boolean);
}

function parseWeaponGrants(text = '') {
  return splitCsvList(text)
    .map((entry) => {
      if (/simple weapons/i.test(entry)) return 'weapon:sim';
      if (/martial weapons/i.test(entry)) return 'weapon:mar';
      return mapSpecificWeaponGrant(entry);
    })
    .filter(Boolean);
}

function mapSpecificWeaponGrant(entry = '') {
  const key = normalizeWeaponGrantKey(entry);
  if (!key) return '';
  return WEAPON_PROFICIENCY_GRANT_MAP[key] || '';
}

function normalizeWeaponGrantKey(entry = '') {
  let key = trimSlugToken(entry).replace(/-/g, '');
  if (!key) return '';

  const aliases = {
    handcrossbows: 'handcrossbow',
    heavycrossbows: 'heavycrossbow',
    lightcrossbows: 'lightcrossbow',
    lighthammers: 'lighthammer'
  };
  if (aliases[key]) return aliases[key];

  if (key.endsWith('staves')) return `${key.slice(0, -6)}staff`;
  if (key.endsWith('axes')) return `${key.slice(0, -2)}e`;
  if (key.endsWith('swords')) return key.slice(0, -1);
  if (key.endsWith('bows')) return key.slice(0, -1);
  if (key.endsWith('s') && WEAPON_PROFICIENCY_GRANT_MAP[key.slice(0, -1)]) return key.slice(0, -1);
  return key;
}

function normalizeToolText(value = '') {
  return normalizeWhitespace(value)
    .replace(/[’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanToolChoicePrefix(value = '') {
  return normalizeToolText(value)
    .replace(/^(?:or|and)\s+/i, '')
    .replace(/^your choice of\s+/i, '')
    .replace(/\bof your choice\b/gi, '')
    .trim();
}

function parseLeadingCount(value = '') {
  const text = cleanToolChoicePrefix(value).replace(/^any\s+/i, '').trim().toLowerCase();
  if (!text) return null;

  const digitMatch = text.match(/^(\d+)\b/);
  if (digitMatch) {
    return safeNumber(digitMatch[1], null);
  }

  for (const [word, count] of Object.entries(NUMBER_WORD_MAP)) {
    if (text.startsWith(`${word} `) || text === word) {
      return count;
    }
  }

  return null;
}

function stripLeadingToolCount(value = '') {
  return cleanToolChoicePrefix(value)
    .replace(/^any\s+/i, '')
    .replace(/^(?:\d+|a|an|one|two|three|four|five)\b\s*/i, '')
    .trim();
}

function normalizeToolOption(value = '') {
  return stripLeadingToolCount(value)
    .replace(/^(?:type|set)\s+of\s+/i, '')
    .replace(/^(?:one|single)\s+/i, '')
    .replace(/\bof your choice\b/gi, '')
    .trim();
}

function mapSpecificToolGrant(entry = '') {
  const text = normalizeToolOption(entry).toLowerCase();
  if (!text) return '';

  const patterns = [
    [/^thieves?'?\s+tools?$/, 'tool:thief'],
    [/^tinker'?s?\s+tools?$/, 'tool:tinker'],
    [/^navigator'?s?\s+tools?$/, 'tool:navg'],
    [/^carpenter'?s?\s+tools?$/, 'tool:carpenter'],
    [/^smith'?s?\s+tools?$/, 'tool:smith'],
    [/^cartographer'?s?\s+tools?$/, 'tool:cartographer'],
    [/^calligrapher'?s?\s+(?:tools?|supplies)$/, 'tool:calligrapher'],
    [/^mason'?s?\s+tools?$/, 'tool:mason'],
    [/^woodcarver'?s?\s+tools?$/, 'tool:woodcarver']
  ];

  for (const [pattern, key] of patterns) {
    if (pattern.test(text)) return key;
  }

  return '';
}

function mapToolChoicePoolEntry(entry = '') {
  const text = normalizeToolOption(entry).toLowerCase();
  if (!text) return '';

  const specific = mapSpecificToolGrant(text);
  if (specific) return specific;

  if (/artisan'?s?\s+(?:tool|tools|kit|kits|supplies|supply|set|sets)/i.test(text)) return 'tool:art:*';
  if (/musical?\s+instrument/i.test(text)) return 'tool:music:*';
  if (/gaming\s+set/i.test(text)) return 'tool:game:*';
  if (/land\s+vehicle/i.test(text)) return 'tool:vehicle:land';
  if (/water\s+vehicle/i.test(text)) return 'tool:vehicle:water';
  if (/air\s+vehicle/i.test(text)) return 'tool:vehicle:air';
  if (/vehicle/i.test(text)) return 'tool:vehicle:*';
  return '';
}

function splitToolChoiceOptions(value = '') {
  return cleanToolChoicePrefix(value)
    .replace(/\s*,\s*or\s+/gi, ',')
    .replace(/\s+or\s+/gi, ',')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseToolChoiceClause(value = '') {
  const raw = normalizeToolText(value);
  if (!raw) return null;

  const isChoiceClause = /^your choice of\b/i.test(raw)
    || /\bof your choice\b/i.test(raw)
    || /\s+or\s+/i.test(raw)
    || /\b(?:\d+|a|an|one|two|three|four|five)\s+(?:type of\s+)?(?:artisan'?s?\s+(?:tool|tools|kit|kits|supplies|supply|set|sets)|musical?\s+instrument|gaming\s+set|vehicle)/i.test(raw)
    || /\bany\s+one\b/i.test(raw);

  if (!isChoiceClause) return null;

  const pool = Array.from(new Set(splitToolChoiceOptions(raw)
    .map(mapToolChoicePoolEntry)
    .filter(Boolean)));
  if (!pool.length) return null;

  return {
    count: parseLeadingCount(raw) || 1,
    pool
  };
}

function parseToolProficiencies(text = '') {
  const normalized = normalizeToolText(text);
  const result = {
    grants: [],
    choices: [],
    unmapped: []
  };
  if (!normalized) return result;

  const clauses = /^your choice of\b/i.test(normalized) ? [normalized] : splitCsvList(normalized);

  for (const clause of clauses) {
    const directGrant = mapSpecificToolGrant(clause);
    if (directGrant) {
      result.grants.push(directGrant);
      continue;
    }

    const choice = parseToolChoiceClause(clause);
    if (choice) {
      result.choices.push(choice);
      continue;
    }

    const fallbackChoiceEntry = mapToolChoicePoolEntry(clause);
    if (fallbackChoiceEntry) {
      result.choices.push({
        count: 1,
        pool: [fallbackChoiceEntry]
      });
      continue;
    }

    result.unmapped.push(clause);
  }

  result.grants = Array.from(new Set(result.grants));
  return result;
}

function buildRequirementsLabel(ownerName, level) {
  return `${ownerName} ${level}`;
}

function detectFeatureActivation(text = '') {
  const raw = String(text || '');
  if (/\bbonus action\b/i.test(raw)) return { type: 'bonus', value: 1 };
  if (/\breaction\b/i.test(raw)) return { type: 'reaction', value: 1 };
  if (/\baction\b/i.test(raw)) return { type: 'action', value: 1 };
  return { type: '', value: null };
}

function createFeatureDocument({ ownerName, ownerIdentifier, ownerType, feature, level, subclassName = '' }) {
  const sourceSplit = splitSourceText(feature.text, {
    name: feature.name,
    identifier: trimSlugToken(`${ownerIdentifier}-${feature.name}`)
  });
  const identifierBase = trimSlugToken(`${ownerIdentifier}-${feature.name}`) || trimSlugToken(feature.name) || 'feature';
  const idSeed = [
    'feature',
    ownerIdentifier,
    subclassName,
    feature.name,
    level,
    sourceSplit.source.book,
    sourceSplit.source.page,
    sourceSplit.content,
    JSON.stringify(feature.rolls),
    JSON.stringify(feature.counter || null)
  ].join('|');
  const id = deterministicId(idSeed);
  const counter = feature.counter || null;
  const activation = detectFeatureActivation(sourceSplit.content);
  const effectData = buildDocumentEffects({
    modifiers: feature.modifiers,
    documentId: id,
    packName: PACK_CONFIG.features.packName,
    documentName: feature.name,
    img: ITEM_ICON_MAP.feat,
    disabled: Boolean(activation.type || counter)
  });
  const passiveEffects = buildFeaturePassiveEffects({
    ownerIdentifier,
    ownerName,
    featureName: feature.name,
    text: sourceSplit.content,
    documentId: id,
    documentName: feature.name,
    img: ITEM_ICON_MAP.feat
  });
  const uses = counter ? {
    max: String(counter.value || ''),
    recovery: counter.reset && RECOVERY_MAP[counter.reset]
      ? [{ period: RECOVERY_MAP[counter.reset], type: 'recoverAll' }]
      : [],
    spent: 0
  } : {
    max: '',
    recovery: [],
    spent: 0
  };

  const activities = {};
  if (activation.type || counter) {
    activities.dnd5eactivity000 = buildBaseActivity('utility', {
      type: activation.type,
      value: activation.value,
      condition: ''
    }, {
      value: '',
      units: '',
      concentration: false,
      special: ''
    }, {
      range: {
        value: '',
        long: '',
        units: 'self',
        special: ''
      },
      target: {
        affects: {
          count: '',
          type: 'self',
          choice: false,
          special: ''
        },
        template: {
          count: '',
          contiguous: false,
          type: '',
          size: '',
          width: '',
          height: '',
          units: ''
        }
      }
    });

    if (counter) {
      activities.dnd5eactivity000.consumption.targets = [{
        type: 'itemUses',
        target: '',
        value: '1',
        scaling: {
          mode: '',
          formula: ''
        }
      }];
    }
  }

  const document = normalizeDocumentBase({
    id,
    name: feature.name,
    type: 'feat',
    img: ITEM_ICON_MAP.feat,
    system: {
      description: {
        value: textToHtml(sourceSplit.content),
        chat: ''
      },
      source: sourceSplit.source,
      uses,
      type: {
        value: 'class',
        subtype: ''
      },
      requirements: buildRequirementsLabel(subclassName || ownerName, level),
      properties: [],
      activities,
      enchant: {},
      prerequisites: {
        level: null
      },
      identifier: identifierBase
    },
    effects: [...effectData.effects, ...passiveEffects],
    flags: buildSourceFlags({
      name: feature.name,
      detail: '',
      classes: '',
      source: sourceSplit.source,
      raw: {
        ownerName,
        ownerType,
        subclassName,
        level,
        feature
      }
    }, 'feature', effectData.unmapped.length ? { unmappedModifiers: effectData.unmapped } : {})
  });

  return {
    document,
    uuid: `Compendium.${MODULE_ID}.${PACK_CONFIG.features.packName}.Item.${id}`
  };
}

function buildClassDescription(classEntry) {
  return classEntry.traits
    .map((trait) => {
      const sourceSplit = splitSourceText(trait.text, {
        name: trait.name,
        identifier: trimSlugToken(`${classEntry.name}-${trait.name}`)
      });
      const body = textToHtml(sourceSplit.content);
      return `<h3>${trait.name}</h3>${body}`;
    })
    .join('');
}

function resolveClassSourceText(classEntry, classIdentifier) {
  const className = normalizeWhitespace(classEntry.name);
  const strippedClassName = normalizeWhitespace(stripEditionSuffix(classEntry.name));
  const matchingTrait = classEntry.traits.find((trait) => {
    const traitName = normalizeWhitespace(trait.name);
    return traitName === className || traitName === strippedClassName;
  });
  if (matchingTrait?.text) return matchingTrait.text;
  if (classEntry.traits[0]?.text) return classEntry.traits[0].text;

  for (const autolevel of classEntry.autolevels) {
    for (const feature of autolevel.features || []) {
      const sourceSplit = splitSourceText(feature.text, {
        name: feature.name,
        identifier: trimSlugToken(`${classIdentifier}-${feature.name}`)
      });
      if (sourceSplit.sourceLine) {
        return `Source:\t${sourceSplit.sourceLine}`;
      }
    }
  }

  return '';
}

function extractTrailingParenthetical(value = '') {
  const text = normalizeWhitespace(value);
  if (!text.endsWith(')')) return '';

  let depth = 0;
  for (let index = text.length - 1; index >= 0; index -= 1) {
    const character = text[index];
    if (character === ')') {
      depth += 1;
      continue;
    }

    if (character !== '(') continue;
    depth -= 1;
    if (depth === 0) {
      return text.slice(index + 1, -1).trim();
    }
  }

  return '';
}

function isAbilityScoreImprovementFeature(name = '') {
  return /^(?:level\s+\d+\s*:\s*)?ability score improvement(?:s)?$/i.test(normalizeWhitespace(name));
}

function isLevelLabelPrefix(name = '') {
  return /^level\s+\d+$/i.test(normalizeWhitespace(name));
}

function normalizeSubclassPlaceholderName(name = '') {
  return normalizeWhitespace(name)
    .replace(/^level\s+\d+\s*:\s*/i, '')
    .toLowerCase();
}

function buildClassFeatureEntries(classEntry) {
  const entries = [];

  for (const autolevel of classEntry.autolevels) {
    const counterSubclassesByName = new Map();
    for (const counter of autolevel.counters) {
      const counterName = normalizeWhitespace(counter.name);
      const subclassName = normalizeWhitespace(counter.subclass);
      if (!counterName || !subclassName) continue;

      const current = counterSubclassesByName.get(counterName) || [];
      current.push(subclassName);
      counterSubclassesByName.set(counterName, current);
    }

    autolevel.features.forEach((feature, index) => {
      const name = normalizeWhitespace(feature.name);
      const colonMatch = name.match(/^([^:]+):\s*(.+)$/);

      entries.push({
        autolevel,
        feature,
        index,
        level: autolevel.level,
        name,
        explicitSubclass: normalizeWhitespace(feature.subclass),
        colonPrefix: colonMatch ? colonMatch[1].trim() : '',
        colonValue: colonMatch ? colonMatch[2].trim() : '',
        parenValue: extractTrailingParenthetical(name),
        counterSubclasses: counterSubclassesByName.get(name) || []
      });
    });
  }

  return entries;
}

function isStrongSubclassIntro(entry) {
  return Boolean(entry.colonValue)
    && !isLevelLabelPrefix(entry.colonPrefix)
    && !isAbilityScoreImprovementFeature(entry.name)
    && !isAbilityScoreImprovementFeature(entry.colonValue);
}

function isGenericSubclassPlaceholderFeature(entry, subclasses) {
  if (entry.explicitSubclass || entry.counterSubclasses.length || entry.parenValue || entry.colonValue) {
    return false;
  }

  const featureName = normalizeSubclassPlaceholderName(entry.name);
  if (!featureName) return false;

  for (const subclass of subclasses.values()) {
    const title = normalizeSubclassPlaceholderName(subclass.title);
    if (!title) continue;
    if (featureName === title || featureName === `${title} feature` || featureName === `${title} features`) {
      return true;
    }
  }

  return false;
}

function resolveSubclassTitle(subclasses) {
  const counts = new Map();
  for (const subclass of subclasses.values()) {
    const title = normalizeWhitespace(subclass.title);
    if (!title) continue;
    counts.set(title, (counts.get(title) || 0) + 1);
  }

  let bestTitle = '';
  let bestCount = 0;
  for (const [title, count] of counts.entries()) {
    if (count > bestCount) {
      bestTitle = title;
      bestCount = count;
    }
  }

  return bestTitle;
}

function extractSubclassFeatures(classEntry) {
  const entries = buildClassFeatureEntries(classEntry);
  const candidates = new Map();
  const ignoredFeatures = new WeakSet();

  function ensureCandidate(name, {
    level = 0,
    description = '',
    introTitle = '',
    introEntry = null,
    explicit = false
  } = {}) {
    const subclassName = normalizeWhitespace(name);
    if (!subclassName) return null;

    const candidate = candidates.get(subclassName) || {
      name: subclassName,
      introLevel: level,
      description: '',
      introTitle: '',
      introEntry: null,
      explicit: false,
      featureEntries: new Set()
    };

    if (!candidate.introLevel || (level && level < candidate.introLevel)) {
      candidate.introLevel = level;
    }
    if (description && !candidate.description) {
      candidate.description = description;
    }
    if (introTitle && !candidate.introTitle) {
      candidate.introTitle = introTitle;
    }
    if (introEntry && !candidate.introEntry) {
      candidate.introEntry = introEntry;
    }
    if (explicit) {
      candidate.explicit = true;
    }

    candidates.set(subclassName, candidate);
    return candidate;
  }

  for (const entry of entries) {
    if (isAbilityScoreImprovementFeature(entry.name)) {
      ignoredFeatures.add(entry.feature);
    }

    if (entry.explicitSubclass) {
      ensureCandidate(entry.explicitSubclass, { level: entry.level, explicit: true });
    }

    entry.counterSubclasses.forEach((subclassName) => {
      ensureCandidate(subclassName, { level: entry.level, explicit: true });
    });

    if (isStrongSubclassIntro(entry)) {
      ensureCandidate(entry.colonValue, {
        level: entry.level,
        description: entry.feature.text,
        introTitle: entry.colonPrefix,
        introEntry: entry
      });
    }
  }

  for (const entry of entries) {
    const candidateNames = new Set();

    if (entry.explicitSubclass && candidates.has(entry.explicitSubclass)) {
      candidateNames.add(entry.explicitSubclass);
    }

    entry.counterSubclasses.forEach((subclassName) => {
      if (candidates.has(subclassName)) {
        candidateNames.add(subclassName);
      }
    });

    if (entry.parenValue && candidates.has(entry.parenValue)) {
      candidateNames.add(entry.parenValue);
    }

    for (const subclassName of candidateNames) {
      const candidate = candidates.get(subclassName);
      if (!candidate || candidate.introEntry === entry) continue;
      candidate.featureEntries.add(entry);
    }
  }

  const subclasses = new Map();
  const ownership = new WeakMap();

  function resolveAssignment(entry) {
    if (entry.explicitSubclass && subclasses.has(entry.explicitSubclass)) {
      return entry.explicitSubclass;
    }

    for (const subclassName of entry.counterSubclasses) {
      if (subclasses.has(subclassName)) {
        return subclassName;
      }
    }

    if (entry.parenValue && subclasses.has(entry.parenValue)) {
      return entry.parenValue;
    }

    if (isStrongSubclassIntro(entry) && subclasses.has(entry.colonValue)) {
      return entry.colonValue;
    }

    return '';
  }

  for (const candidate of candidates.values()) {
    if (!candidate.explicit && candidate.featureEntries.size === 0) continue;
    subclasses.set(candidate.name, {
      name: candidate.name,
      introLevel: candidate.introLevel,
      description: candidate.description,
      features: [],
      title: candidate.introTitle
    });
  }

  for (const entry of entries) {
    if (isGenericSubclassPlaceholderFeature(entry, subclasses)) {
      ignoredFeatures.add(entry.feature);
    }
  }

  for (const entry of entries) {
    const subclassName = resolveAssignment(entry);
    if (!subclassName) continue;

    const subclass = subclasses.get(subclassName);
    if (!subclass) continue;

    const isIntro = isStrongSubclassIntro(entry) && entry.colonValue === subclassName && subclass.description === entry.feature.text;
    ownership.set(entry.feature, {
      subclassName,
      isIntro
    });

    if (isIntro) continue;

    subclass.features.push({
      ...entry.feature,
      level: entry.level
    });
  }

  for (const autolevel of classEntry.autolevels) {
    for (const counter of autolevel.counters) {
      if (!counter.subclass) continue;
      const subclass = subclasses.get(counter.subclass);
      if (!subclass) continue;
      const feature = subclass.features.find((entry) => entry.level === autolevel.level && entry.name === counter.name);
      if (feature) {
        feature.counter = counter;
      }
    }
  }

  return {
    subclasses,
    ownership,
    ignoredFeatures
  };
}

function detectSubclassTitle(subclasses) {
  return resolveSubclassTitle(subclasses);
}

function convertClass(classEntry) {
  const classIdentifier = trimSlugToken(classEntry.name) || 'class';
  const classSource = resolveClassSourceText(classEntry, classIdentifier);
  const classSourceSplit = splitSourceText(classSource, {
    name: classEntry.name,
    identifier: classIdentifier
  });
  const classId = deterministicId(['class', classEntry.name].join('|'));
  const spellAbility = SPELL_ABILITY_MAP[normalizeAbilityLabel(classEntry.spellAbility)] || '';
  const spellcastingProgression = inferSpellcastingProgression(classEntry);
  const primaryAbility = inferPrimaryAbility(classEntry, spellAbility);
  const { saves, skills } = parseSkillAndSaveData(classEntry.proficiency);
  const subclassData = extractSubclassFeatures(classEntry);
  const subclasses = subclassData.subclasses;
  const features = [];
  const classAdvancements = [
    {
      _id: deterministicId(`hit-points|${classIdentifier}`),
      type: 'HitPoints',
      configuration: {},
      value: {},
      title: 'Hit Points'
    }
  ];

  const armorGrants = parseArmorGrants(classEntry.armor);
  if (armorGrants.length) {
    classAdvancements.push(buildTraitAdvancement({
      grants: armorGrants,
      choices: [],
      level: 1,
      classRestriction: 'primary'
    }));
  }

  const weaponGrants = parseWeaponGrants(classEntry.weapons);
  if (weaponGrants.length) {
    classAdvancements.push(buildTraitAdvancement({
      grants: weaponGrants,
      choices: [],
      level: 1,
      classRestriction: 'primary'
    }));
  }

  const toolData = parseToolProficiencies(classEntry.tools);
  if (toolData.grants.length || toolData.choices.length) {
    classAdvancements.push(buildTraitAdvancement({
      grants: toolData.grants,
      choices: toolData.choices,
      level: 1,
      classRestriction: 'primary'
    }));
  }

  if (saves.length) {
    classAdvancements.push(buildTraitAdvancement({
      grants: saves.map((save) => `saves:${save}`),
      choices: [],
      level: 1,
      classRestriction: 'primary'
    }));
  }

  if (skills.length && classEntry.numSkills) {
    classAdvancements.push(buildTraitAdvancement({
      grants: [],
      choices: [{
        count: classEntry.numSkills,
        pool: buildSkillChoicePool(skills)
      }],
      level: 1,
      classRestriction: 'primary'
    }));
  }

  const subclassIntroLevel = Math.min(...[...subclasses.values()].map((entry) => entry.introLevel).filter(Boolean), Number.POSITIVE_INFINITY);
  for (const autolevel of classEntry.autolevels) {
    const levelFeatures = [];
    for (const feature of autolevel.features) {
      const ignoreFeature = /^(Starting|Multiclass)/i.test(feature.name);
      if (subclassData.ownership.has(feature) || subclassData.ignoredFeatures.has(feature) || ignoreFeature) continue;

      const featureDoc = createFeatureDocument({
        ownerName: classEntry.name,
        ownerIdentifier: classIdentifier,
        ownerType: 'class',
        feature,
        level: autolevel.level
      });
      features.push(featureDoc.document);
      levelFeatures.push(featureDoc.uuid);
    }

    for (const counter of autolevel.counters) {
      const matchedFeature = features.find((entry) => entry.system.identifier === trimSlugToken(`${classIdentifier}-${counter.name}`));
      if (!matchedFeature) continue;
      matchedFeature.system.uses = {
        max: String(counter.value || ''),
        recovery: RECOVERY_MAP[counter.reset] ? [{ period: RECOVERY_MAP[counter.reset], type: 'recoverAll' }] : [],
        spent: 0
      };
    }

    if (levelFeatures.length) {
      classAdvancements.push(buildItemGrantAdvancement(autolevel.level, levelFeatures));
    }

    if (autolevel.scoreImprovement) {
      classAdvancements.push(buildAbilityScoreImprovement(autolevel.level));
    }
  }

  classAdvancements.push(...buildClassCompatibilityAdvancements(classEntry));

  if (Number.isFinite(subclassIntroLevel)) {
    classAdvancements.push(buildSubclassAdvancement(subclassIntroLevel, detectSubclassTitle(subclasses) || 'Subclass'));
  }

  const classFlagExtras = toolData.unmapped.length ? { unmappedToolProficiencies: toolData.unmapped } : {};

  const classDocument = normalizeDocumentBase({
    id: classId,
    name: classEntry.name,
    type: 'class',
    img: ITEM_ICON_MAP.class,
    system: {
      description: {
        value: buildClassDescription(classEntry),
        chat: ''
      },
      source: classSourceSplit.source,
      identifier: classIdentifier,
      levels: 1,
      hitDice: `d${safeNumber(classEntry.hd, 6)}`,
      hitDiceUsed: 0,
      advancement: classAdvancements,
      spellcasting: {
        progression: spellcastingProgression,
        ability: spellAbility,
        preparation: spellAbility ? {
          formula: `@abilities.${spellAbility}.mod + @classes.${classIdentifier}.levels`
        } : {}
      },
      startingEquipment: [],
      wealth: classEntry.wealth ? classEntry.wealth.replace(/x/g, ' * ') : '',
      primaryAbility
    },
      flags: buildSourceFlags({
        name: classEntry.name,
        detail: '',
        classes: '',
        source: classSourceSplit.source,
        raw: classEntry
      }, 'class', classFlagExtras)
  });

  const subclassDocuments = [];
  for (const subclass of subclasses.values()) {
    const subclassIdentifier = trimSlugToken(subclass.name) || 'subclass';
    const subclassId = deterministicId(['subclass', classIdentifier, subclass.name].join('|'));
    const subclassSourceSplit = splitSourceText(subclass.description, {
      name: subclass.name,
      identifier: subclassIdentifier
    });
    const advancements = [];

    const grouped = new Map();
    for (const feature of subclass.features) {
      const featureDoc = createFeatureDocument({
        ownerName: classEntry.name,
        ownerIdentifier: classIdentifier,
        ownerType: 'subclass',
        feature,
        level: feature.level,
        subclassName: subclass.name
      });
      features.push(featureDoc.document);
      const current = grouped.get(feature.level) || [];
      current.push(featureDoc.uuid);
      grouped.set(feature.level, current);
    }

    for (const [level, uuids] of [...grouped.entries()].sort((left, right) => left[0] - right[0])) {
      advancements.push(buildItemGrantAdvancement(level, uuids));
    }

    subclassDocuments.push(normalizeDocumentBase({
      id: subclassId,
      name: subclass.name,
      type: 'subclass',
      img: ITEM_ICON_MAP.subclass,
      system: {
        description: {
          value: textToHtml(subclassSourceSplit.content),
          chat: ''
        },
        source: subclassSourceSplit.source,
        identifier: subclassIdentifier,
        classIdentifier,
        advancement: advancements,
        spellcasting: {
          progression: 'none',
          ability: '',
          preparation: {}
        }
      },
      flags: buildSourceFlags({
        name: subclass.name,
        detail: '',
        classes: classEntry.name,
        source: subclassSourceSplit.source,
        raw: subclass
      }, 'subclass')
    }));
  }

  return {
    classDocument,
    subclassDocuments,
    featureDocuments: features
  };
}

function generateCompendiumDocuments(parsed) {
  const spellEntries = parsed.spells.filter((spell) => !isFeatureLikeSpell(spell));
  const spellFeatureEntries = parsed.spells.filter(isFeatureLikeSpell);
  const spells = spellEntries.map(convertSpell);
  const items = parsed.items.map(convertItem);
  const classes = [];
  const subclasses = [];
  const features = spellFeatureEntries.map(convertFeatureLikeSpell);

  parsed.classes.forEach((classEntry) => {
    const result = convertClass(classEntry);
    classes.push(result.classDocument);
    subclasses.push(...result.subclassDocuments);
    features.push(...result.featureDocuments);
  });

  return {
    spells: dedupeDocuments(spells),
    items: dedupeDocuments(items),
    classes: dedupeDocuments(classes),
    subclasses: dedupeDocuments(subclasses),
    features: dedupeDocuments(features)
  };
}

function dedupeDocuments(documents) {
  const seen = new Map();
  const result = [];

  documents.forEach((document) => {
    const serialized = serializeDocumentForDedupe(document);
    const existing = seen.get(document._id);
    if (!existing) {
      seen.set(document._id, serialized);
      result.push(document);
      return;
    }

    if (existing !== serialized) {
      throw new Error(`Conflicting generated document collision for _id ${document._id}`);
    }
  });

  return result;
}

function serializeDocumentForDedupe(document) {
  const comparable = structuredClone(document);
  if (comparable.flags?.[MODULE_ID]?.fc5) {
    delete comparable.flags[MODULE_ID].fc5.raw;
  }
  return JSON.stringify(comparable);
}

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildFolderDocument({ id, name, folder = null, type = 'Item', sort = 0 }) {
  return {
    _id: id,
    _key: `!folders!${id}`,
    name,
    type,
    folder,
    sorting: 'a',
    sort,
    color: null,
    flags: {},
    ownership: { default: 0 }
  };
}

function normalizeCompendiumFolderBook(value = '') {
  const parsed = parseSourceCitation(value);
  const book = parsed.book || value;
  return stripSourceCategorySuffix(normalizeWhitespace(book)
    .split(/\s*,\s+/)[0]
    .replace(/\bp\.\s*[0-9A-Za-z-]+.*$/i, '')
    .trim()) || 'Unknown Source';
}

function getDocumentSourceBook(document) {
  return document.flags?.[MODULE_ID]?.fc5?.sourceBook
    || document.system?.source?.book
    || 'Unknown Source';
}

function buildPackFolderDocuments(documents, config = {}) {
  if (!config.folderName) return { folders: [], documents };

  const packName = config.packName || config.sourceDir || 'pack';
  const documentType = config.type || 'Item';
  const rootId = deterministicId(`folder|${packName}|Monster Creator`);
  const rootFolder = buildFolderDocument({
    id: rootId,
    name: 'Monster Creator',
    type: documentType,
    sort: 0
  });
  const folders = [rootFolder];
  const folderIds = new Set([rootId]);
  const books = Array.from(new Set(documents.map((document) => normalizeCompendiumFolderBook(getDocumentSourceBook(document)))))
    .sort((left, right) => left.localeCompare(right));

  const bookFolderIds = new Map();
  const kindFolderIds = new Map();
  books.forEach((book, index) => {
    const bookId = deterministicId(`folder|${packName}|Monster Creator|${book}`);
    bookFolderIds.set(book, bookId);
    if (!folderIds.has(bookId)) {
      folderIds.add(bookId);
      folders.push(buildFolderDocument({
        id: bookId,
        name: book,
        folder: rootId,
        type: documentType,
        sort: (index + 1) * 100000
      }));
    }

    const kindId = deterministicId(`folder|${packName}|Monster Creator|${book}|${config.folderName}`);
    kindFolderIds.set(book, kindId);
    if (!folderIds.has(kindId)) {
      folderIds.add(kindId);
      folders.push(buildFolderDocument({
        id: kindId,
        name: config.folderName,
        folder: bookId,
        type: documentType,
        sort: 100000
      }));
    }
  });

  documents.forEach((document) => {
    const book = normalizeCompendiumFolderBook(getDocumentSourceBook(document));
    document.folder = kindFolderIds.get(book) || rootId;
  });

  return { folders, documents };
}

function writeJsonDocuments(outputDir, documents, config = {}) {
  ensureCleanDir(outputDir);
  const seen = new Set();
  const { folders, documents: folderedDocuments } = buildPackFolderDocuments(documents, config);
  [...folders, ...folderedDocuments].forEach((document) => {
    const identifier = trimSlugToken(document.name) || document._id;
    const filename = `${identifier}-${document._id}.json`;
    if (seen.has(filename)) {
      throw new Error(`Duplicate generated filename detected: ${filename}`);
    }
    seen.add(filename);
    fs.writeFileSync(path.join(outputDir, filename), JSON.stringify(document, null, 2));
  });
}

async function compilePackSources(sourceRoot, packRoot) {
  let compilePack;
  try {
    ({ compilePack } = require('@foundryvtt/foundryvtt-cli'));
  } catch (error) {
    const imported = await import('@foundryvtt/foundryvtt-cli');
    compilePack = imported.compilePack;
  }

  for (const key of Object.keys(PACK_CONFIG)) {
    const config = PACK_CONFIG[key];
    const src = path.join(sourceRoot, config.sourceDir);
    const dest = path.join(packRoot, config.packDir);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await compilePack(src, dest);
  }
}

function parseFc5Xml(xmlText) {
  return extractTopLevelEntries(xmlText);
}

function readFc5Xml(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function summarizeDocuments(documents) {
  return Object.fromEntries(Object.entries(documents).map(([key, value]) => [key, value.length]));
}

module.exports = {
  MODULE_ID,
  PACK_CONFIG,
  parseFc5Xml,
  readFc5Xml,
  generateCompendiumDocuments,
  dedupeDocuments,
  summarizeDocuments,
  writeJsonDocuments,
  buildPackFolderDocuments,
  compilePackSources,
  splitSourceText,
  textToHtml,
  deterministicId,
  trimSlugToken,
  normalizeSpell,
  isFeatureLikeSpell,
  convertSpell,
  convertFeatureLikeSpell,
  convertItem,
  convertClass
};
