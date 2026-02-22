import { sbiParser as localSbiParser } from './sbi-importer/sbiParser.js';
import { sbiUtils } from './sbi-importer/sbiUtils.js';

const PARSER_FALLBACK_ICON = 'icons/svg/mystery-man.svg';

const BLOCK_IDS = {
  armor: 'armor',
  actions: 'actions',
  abilities: 'abilities',
  bonusActions: 'bonusActions',
  challenge: 'challenge',
  conditionImmunities: 'conditionImmunities',
  damageImmunities: 'damageImmunities',
  damageResistances: 'damageResistances',
  damageVulnerabilities: 'damageVulnerabilities',
  features: 'features',
  health: 'health',
  lairActions: 'lairActions',
  languages: 'languages',
  legendaryActions: 'legendaryActions',
  reactions: 'reactions',
  savingThrows: 'savingThrows',
  senses: 'senses',
  skills: 'skills',
  speed: 'speed',
  souls: 'souls',
  race: 'race',
  traits: 'traits',
  utilitySpells: 'utilitySpells',
  villainActions: 'villainActions'
};

const TOP_BLOCK_IDS = [
  BLOCK_IDS.armor,
  BLOCK_IDS.abilities,
  BLOCK_IDS.challenge,
  BLOCK_IDS.conditionImmunities,
  BLOCK_IDS.damageImmunities,
  BLOCK_IDS.damageResistances,
  BLOCK_IDS.damageVulnerabilities,
  BLOCK_IDS.health,
  BLOCK_IDS.languages,
  BLOCK_IDS.savingThrows,
  BLOCK_IDS.senses,
  BLOCK_IDS.skills,
  BLOCK_IDS.speed,
  BLOCK_IDS.souls,
];

const KNOWN_ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const KNOWN_CREATURE_TYPES = [
  'aberration',
  'celestial',
  'dragon',
  'fey',
  'fiend',
  'giant',
  'humanoid',
  'monstrosity',
  'ooze',
  'undead',
  'beast',
  'construct',
  'elemental',
  'plant',
  'swarm',
  'human',
];

const sbiRegex = {
  armor: /^((armor|armour) class)\s\d+/i,
  actions: /^actions$/i,
  abilities: /^(\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b)/i,
  bonusActions: /^bonus actions$/i,
  challenge: /^(challenge|\bcr\b|challenge rating)\s\d+/i,
  conditionImmunities: /^condition immunities\s/i,
  damageImmunities: /^damage immunities\s/i,
  damageResistances: /^damage resistances\s/i,
  damageVulnerabilities: /^damage vulnerabilities\s/i,
  health: /^(hit points|\bhp\b)\s\d+/i,
  lairActions: /^lair actions$/i,
  languages: /^languages\s/i,
  legendaryActions: /^legendary actions$/i,
  mythicActions: /^mythic actions$/i,
  racialDetails: /^(?<size>\bfine\b|\bdiminutive\b|\btiny\b|\bsmall\b|\bmedium\b|\blarge\b|\bhuge\b|\bgargantuan\b)(\sswarm of (?<swarmsize>\w+))?\s(?<type>\w+)([,\s]+\((?<race>[,\w\s]+)\))?([,\s]+(?<alignment>[\w\s\-]+))?/i,
  reactions: /^reactions$/i,
  savingThrows: /^(saving throws|saves)\s(\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b)/i,
  senses: /^senses( passive)?(.+\d+\s\bft\b)?/i,
  skills: /^skills.+[\+-]\d+/i,
  souls: /^souls\s\d+/i,
  speed: /^speed\s\d+\sft/i,
  traits: /^traits$/i,
  utilitySpells: /^utility spells$/i,
  villainActions: /^villain actions$/i,
  lineCheckRegexes: [
    { r: /^((armor|armour) class)\s\d+/i, id: BLOCK_IDS.armor },
    { r: /^actions$/i, id: BLOCK_IDS.actions },
    { r: /^(\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b)/i, id: BLOCK_IDS.abilities },
    { r: /^bonus actions$/i, id: BLOCK_IDS.bonusActions },
    { r: /^(challenge|\bcr\b|challenge rating)\s\d+/i, id: BLOCK_IDS.challenge },
    { r: /^condition immunities\s/i, id: BLOCK_IDS.conditionImmunities },
    { r: /^damage immunities\s/i, id: BLOCK_IDS.damageImmunities },
    { r: /^damage resistances\s/i, id: BLOCK_IDS.damageResistances },
    { r: /^damage vulnerabilities\s/i, id: BLOCK_IDS.damageVulnerabilities },
    { r: /^(hit points|\bhp\b)\s\d+/i, id: BLOCK_IDS.health },
    { r: /^lair actions$/i, id: BLOCK_IDS.lairActions },
    { r: /^languages\s/i, id: BLOCK_IDS.languages },
    { r: /^legendary actions$/i, id: BLOCK_IDS.legendaryActions },
    { r: /^mythic actions$/i, id: BLOCK_IDS.legendaryActions },
    { r: /^reactions$/i, id: BLOCK_IDS.reactions },
    { r: /^(saving throws|saves)\s(\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b)/i, id: BLOCK_IDS.savingThrows },
    { r: /^senses( passive)?(.+\d+\s\bft\b)?/i, id: BLOCK_IDS.senses },
    { r: /^skills.+[\+-]\d+/i, id: BLOCK_IDS.skills },
    { r: /^souls\s\d+/i, id: BLOCK_IDS.souls },
    { r: /^speed\s\d+\sft/i, id: BLOCK_IDS.speed },
    { r: /^traits$/i, id: BLOCK_IDS.traits },
    { r: /^utility spells$/i, id: BLOCK_IDS.utilitySpells },
    { r: /^villain actions$/i, id: BLOCK_IDS.villainActions },
    { r: /^\(?(?<size>\bfine\b|\bdiminutive\b|\btiny\b|\bsmall\b|\bmedium\b|\blarge\b|\bhuge\b|\bgargantuan\b)(\sswarm of (?<swarmsize>\w+))?\s(?<type>\w+)([,\s]+\((?<race>[,\w\s]+)\))?([,\s]+(?<alignment>[\w\s\-]+))?/i, id: BLOCK_IDS.race }
  ],
  blockTitle: /^(([A-Z][\w\d\-+,;'’]+[\s-]?)((of|and|the|from|in|at|on|with|to|by|into)\s)?([\w\d\-+,;'’]+\s?){0,3}(\([\w –\-\/]+\))?)[.!]/,
  blockTitleLegacy: /^([A-Za-z].*[.!?])$/,
  abilityNames: /\bstr\b|\bdex\b|\bcon\b|\bint\b|\bwis\b|\bcha\b/ig,
  abilityValues: /(?<base>\d+)\s*\((?<modifier>[\+\-−–]?\d+)\)/g,
  armorDetails: /(?<ac>\d+)( \((?<armortype>.+)\))?/i,
  challengeDetails: /(?<cr>(½|[\d\/]+))\s?(\((?<xp>[\d,]+)\s?xp\))?/i,
  rollDetails: /(?<value>\d+)\s?(\((?<formula>\d+d\d+(\s?[\+\-−]\s?\d+)?)\))?/i,
  racialDetails: /^(?<size>\bfine\b|\bdiminutive\b|\btiny\b|\bsmall\b|\bmedium\b|\blarge\b|\bhuge\b|\bgargantuan\b)(\sswarm of (?<swarmsize>\w+))?\s(?<type>\w+)([,\s]+\((?<race>[,\w\s]+)\))?([,\s]+(?<alignment>[\w\s\-]+))?/i,
  challenge: /(Challenge|\bcr\b|challenge rating)\s*(?<cr>[\d/½]+)\s*(\((?<xp>[\d,]+)\s*xp\))?/i,
  rollLine: /(?<value>\d+)\s*\((?<formula>\d+d\d+(\s?[\+\-−]\s?\d+)?)\)/i,
  sensesDetails: /(?<name>\w+) (?<modifier>\d+)/ig,
  skillDetails: /(?<name>acrobatics|arcana|athletics|animal handling|deception|history|insight|intimidation|investigation|medicine|nature|perception|performance|persuasion|religion|sleight of hand|stealth|survival) (?<modifier>[\+|-]\d+)/ig,
  speedDetails: /(?<name>\w+)\s?(?<value>\d+)/ig,
  conditionTypes: /\bblinded\b|\bcharmed\b|\bdeafened\b|\bdiseased\b|\bexhaustion\b|\bfrightened\b|\bincapacitated\b|\binvisible\b|\bparalyzed\b|\bpetrified\b|\bpoisoned\b|\bprone\b|\brestrained\b|\bstunned\b|\bunconscious\b/ig,
  damageTypes: /\bbludgeoning\b|\bpiercing\b|\bslashing\b|\bacid\b|\bcold\b|\bfire\b|\blightning\b|\bnecrotic\b|\bpoison\b|\bpsychic\b|\bradiant\b|\bthunder\b/ig,
};

const getFirstMatch = (line, excludeIds = []) => {
  return sbiRegex.lineCheckRegexes.find((entry) => {
    const match = entry.r.exec(line);
    entry.r.lastIndex = 0;
    return match && !excludeIds.includes(entry.id);
  });
};

const safeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const makeSlug = (value) => {
  const base = safeString(value, 'monster').toLowerCase().normalize('NFKD');
  return base
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
};

const combineToString = (lines = []) => {
  return lines
    .filter(Boolean)
    .join(' ')
    .replace(/  /g, ' ')
    .replace('- ', '-');
};

const splitSentences = (lines = []) => {
  return combineToString(lines)
    .split(/[.!]/)
    .filter(Boolean)
    .map((line) => line.trim() + '.');
};

const formatForDisplay = (text = '') => {
  if (!text) return '';
  const textLines = text.replaceAll('•', '\n•').split('\n');
  if (textLines.length > 1) {
    return `<p>${textLines.join('</p><p>')}</p>`;
  }
  return textLines.join('');
};

class MonsterData {
  constructor(name) {
    this.name = name;
    this.actions = [];
    this.armor = null;
    this.abilities = {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10
    };
    this.alignment = null;
    this.bonusActions = [];
    this.challenge = null;
    this.features = [];
    this.health = null;
    this.languages = null;
    this.lairActions = [];
    this.legendaryActions = [];
    this.reactions = [];
    this.savingThrows = [];
    this.senses = [];
    this.skills = [];
    this.speeds = [];
    this.speedAll = {};
    this.size = null;
    this.souls = null;
    this.type = null;
    this.conditionImmunities = [];
    this.damageImmunities = [];
    this.damageResistances = [];
    this.damageVulnerabilities = [];
    this.specialConditionImmunities = null;
    this.specialDamageImmunities = null;
    this.specialDamageResistances = null;
    this.specialDamageVulnerabilities = null;
    this.freeLines = [];
    this.desc = [];
  }
}

const parseRoll = (line) => {
  const match = sbiRegex.rollLine.exec(line);
  if (!match || !match.groups) {
    return null;
  }

  return {
    value: safeNumber(match.groups.value, 0),
    formula: safeString(match.groups.formula, '')
  };
};

const SBI_MODULE_ID = '5e-statblock-importer';

const toSafeLines = (text) => String(text || '')
  .replace(/\r\n/g, '\n')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const parseStatblockWithImporter = (text) => {
  if (typeof localSbiParser?.parseInput === 'function') {
    try {
      const importerResult = localSbiParser.parseInput(text);
      if (importerResult && importerResult.actor) {
        const statBlocks = importerResult.statBlocks instanceof Map
          ? importerResult.statBlocks
          : new Map(Object.entries(importerResult.statBlocks || {}));

        return {
          actor: importerResult.actor,
          statBlocks,
          unknownLines: Array.isArray(importerResult.unknownLines) ? importerResult.unknownLines : [],
          lines: Array.isArray(importerResult.lines) ? importerResult.lines : []
        };
      }
    } catch (error) {
      sbiUtils.warn('[monster-creator-parser] local copied importer parse failed, falling back', error);
    }
  }

  const importerModule = globalThis?.game?.modules?.get?.(SBI_MODULE_ID);
  const parse = importerModule?.api?.parseInput || importerModule?.api?.parse;
  if (typeof parse !== 'function') {
    return null;
  }

  let result = null;
  try {
    result = parse(text);
  } catch (error) {
    sbiUtils.warn('[monster-creator-parser] importer parse failed, using local parser', error);
    return null;
  }

  if (!result || !result.actor) {
    return null;
  }

  const statBlocks = result.statBlocks instanceof Map
    ? result.statBlocks
    : new Map(Object.entries(result.statBlocks || {}));

  return {
    actor: result.actor,
    statBlocks,
    unknownLines: Array.isArray(result.unknownLines) ? result.unknownLines : [],
    lines: Array.isArray(result.lines) ? result.lines : toSafeLines(text)
  };
};

const parseChallenge = (line) => {
  const match = sbiRegex.challenge.exec(line);
  if (!match || !match.groups) {
    return null;
  }

  const value = safeString(match.groups.cr, '0');
  if (value === '½') {
    return { cr: 0.5, xp: 0 };
  }

  if (value.includes('/')) {
    const [left, right] = value.split('/').map((x) => safeNumber(x, 0));
    if (left && right) {
      return { cr: left / right, xp: 0 };
    }
  }

  return {
    cr: safeNumber(value, 0),
    xp: safeNumber((match.groups.xp || match.groups.XP || '').replace(/,/g, ''), 0)
  };
};

const setNameValueLines = (lines = []) => {
  const result = [];
  for (const sentence of splitSentences(lines)) {
    const parts = sentence
      .split(/:\s*/)
      .map((str) => str.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const first = parts.shift();
      result.push({ name: first, value: formatForDisplay(parts.join(': ')) });
    } else if (parts.length === 1 && result.length) {
      const last = result[result.length - 1];
      last.value = `${last.value || ''} ${parts[0]}`.trim();
    }
  }
  return result;
};

const getBlockDatas = (lines = []) => {
  const validLines = lines.filter(Boolean);
  if (!validLines.length) {
    return [];
  }

  const lineText = splitSentences(validLines);
  const result = [];
  let active = null;

  for (const sentence of lineText) {
    const titleMatch = sbiRegex.blockTitle.exec(sentence) || sbiRegex.blockTitleLegacy.exec(sentence);
    if (titleMatch) {
      active = { name: sentence.replace(/[.!]$/, ''), value: '' };
      result.push(active);
    } else if (active) {
      if (active.value) {
        active.value = `${active.value} ${sentence}`;
      } else {
        active.value = sentence;
      }
    } else {
      result.push({ name: 'Description', value: sentence });
      active = result[result.length - 1];
    }
  }

  return result.map((item) => ({
    name: item.name,
    value: formatForDisplay(item.value || '')
  }));
};

const parseDamageOrConditionLine = (lines, type, monster) => {
  const line = combineToString(lines);
  if (!line) return;

  const clean = line
    .replace(/^damage immunities/i, '')
    .replace(/^damage resistances/i, '')
    .replace(/^damage vulnerabilities/i, '')
    .replace(/^condition immunities/i, '')
    .trim();

  const tokens = clean
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

  const known = {
    conditionImmunities: /\b(a?blinded|charmed|deafened|diseased|exhaustion|frightened|incapacitated|invisible|paralyzed|petrified|poisoned|prone|restrained|stunned|unconscious)\b/ig,
    damageImmunities: sbiRegex.damageTypes,
    damageResistances: sbiRegex.damageTypes,
    damageVulnerabilities: sbiRegex.damageTypes,
  };

  const tokenValues = [...clean.matchAll(known[type] || sbiRegex.conditionTypes)]
    .map((match) => match[0].toLowerCase())
    .filter(Boolean);

  const special = clean
    .replace(known[type] || sbiRegex.conditionTypes, '')
    .replace(/\s+,/g, ',')
    .replace(/^,|,$/, '')
    .trim();

  if (type === 'conditionImmunities') {
    monster.conditionImmunities = tokenValues;
    monster.specialConditionImmunities = special || null;
  } else if (type === 'damageImmunities') {
    monster.damageImmunities = tokenValues;
    monster.specialDamageImmunities = special || null;
  } else if (type === 'damageResistances') {
    monster.damageResistances = tokenValues;
    monster.specialDamageResistances = special || null;
  } else if (type === 'damageVulnerabilities') {
    monster.damageVulnerabilities = tokenValues;
    monster.specialDamageVulnerabilities = special || null;
  }

  if (tokens.length && !tokenValues.length) {
    monster[type] = tokens;
  }
};

const getRacialDetails = (line, monster) => {
  const match = sbiRegex.racialDetails.exec(line);
  if (!match || !match.groups) return;

  monster.size = safeString(match.groups.size, monster.size);
  monster.type = safeString(match.groups.type, monster.type);
  monster.alignment = safeString(match.groups.alignment, monster.alignment);
  monster.race = safeString(match.groups.race, null);

  const singularType = monster.type ? monster.type.toLowerCase().replace(/s$/, '') : null;
  if (singularType && KNOWN_CREATURE_TYPES.includes(singularType)) {
    monster.type = singularType;
    monster.customType = null;
  } else if (monster.type) {
    monster.customType = monster.type;
  }
};

const applyActionLines = (lines, type, monster) => {
  const blockLines = [...lines];
  if (type !== BLOCK_IDS.features) {
    blockLines.shift();
  }

  if (type === BLOCK_IDS.features) {
    monster.features = getBlockDatas(blockLines);
    return;
  }

  const values = getBlockDatas(blockLines);
  if (type === BLOCK_IDS.actions) {
    monster.actions = values;
  } else if (type === BLOCK_IDS.bonusActions) {
    monster.bonusActions = values;
  } else if (type === BLOCK_IDS.reactions) {
    monster.reactions = values;
  } else if (type === BLOCK_IDS.legendaryActions) {
    monster.legendaryActions = values;
  } else if (type === BLOCK_IDS.lairActions) {
    monster.lairActions = values;
  } else if (type === BLOCK_IDS.villainActions) {
    monster.villainActions = values;
  } else if (type === BLOCK_IDS.traits) {
    monster.features = monster.features.concat(values);
  }
};

const applySetters = {
  [BLOCK_IDS.actions]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.actions, monster),
  [BLOCK_IDS.bonusActions]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.bonusActions, monster),
  [BLOCK_IDS.reactions]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.reactions, monster),
  [BLOCK_IDS.lairActions]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.lairActions, monster),
  [BLOCK_IDS.legendaryActions]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.legendaryActions, monster),
  [BLOCK_IDS.villainActions]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.villainActions, monster),
  [BLOCK_IDS.traits]: (lines, monster) => applyActionLines(lines, BLOCK_IDS.traits, monster),
  [BLOCK_IDS.health]: (lines, monster) => {
    const roll = parseRoll(combineToString(lines));
    if (roll) monster.health = roll;
  },
  [BLOCK_IDS.souls]: (lines, monster) => {
    const roll = parseRoll(combineToString(lines));
    if (roll) monster.souls = roll;
  },
  [BLOCK_IDS.armor]: (lines, monster) => {
    const match = sbiRegex.armorDetails.exec(combineToString(lines));
    if (!match || !match.groups) return;

    const armorType = match.groups.armortype ? match.groups.armortype.split(',').map((item) => item.trim()) : ['natural armor'];
    monster.armor = {
      ac: safeNumber(match.groups.ac, 10),
      types: armorType
    };
  },
  [BLOCK_IDS.abilities]: (lines, monster) => {
    const foundNames = [];
    const foundValues = [];

    for (const line of lines) {
      const names = [...line.matchAll(sbiRegex.abilityNames)].map((item) => item[0].toLowerCase());
      const values = [...line.matchAll(sbiRegex.abilityValues)]
        .map((item) => safeNumber(item.groups.base, null));

      if (names.length) {
        foundNames.push(...names);
      }
      if (values.length) {
        foundValues.push(...values);
      }

      if (foundValues.length >= KNOWN_ABILITIES.length) {
        break;
      }
    }

    if (!foundNames.length || !foundValues.length) return;

    for (let i = 0; i < Math.min(KNOWN_ABILITIES.length, foundNames.length, foundValues.length); i++) {
      monster.abilities[KNOWN_ABILITIES[i]] = safeNumber(foundValues[i], 10);
    }
  },
  [BLOCK_IDS.challenge]: (lines, monster) => {
    const parsed = parseChallenge(combineToString(lines));
    if (parsed) monster.challenge = parsed;
  },
  [BLOCK_IDS.languages]: (lines, monster) => {
    const trimmed = combineToString(lines);
    const value = trimmed.replace(/^languages\s*/i, '').trim();
    if (!value) return;

    monster.languages = {
      known: value.split(',').map((entry) => entry.trim()).filter(Boolean),
      raw: trimmed
    };
  },
  [BLOCK_IDS.conditionImmunities]: (lines, monster) => parseDamageOrConditionLine(lines, 'conditionImmunities', monster),
  [BLOCK_IDS.damageImmunities]: (lines, monster) => parseDamageOrConditionLine(lines, 'damageImmunities', monster),
  [BLOCK_IDS.damageResistances]: (lines, monster) => parseDamageOrConditionLine(lines, 'damageResistances', monster),
  [BLOCK_IDS.damageVulnerabilities]: (lines, monster) => parseDamageOrConditionLine(lines, 'damageVulnerabilities', monster),
  [BLOCK_IDS.savingThrows]: (lines, monster) => {
    const line = combineToString(lines);
    monster.savingThrows = [...line.matchAll(sbiRegex.abilityNames)].map((m) => m[0].toLowerCase());
  },
  [BLOCK_IDS.senses]: (lines, monster) => {
    const line = combineToString(lines);
    monster.senses = [...line.matchAll(sbiRegex.sensesDetails)]
      .map((m) => ({ name: m.groups?.name, value: m.groups?.modifier }))
      .filter((entry) => entry.name && entry.value);
  },
  [BLOCK_IDS.skills]: (lines, monster) => {
    const line = combineToString(lines);
    monster.skills = [...line.matchAll(sbiRegex.skillDetails)]
      .map((m) => ({ name: m.groups?.name, value: m.groups?.modifier }))
      .filter((entry) => entry.name && entry.value);
  },
  [BLOCK_IDS.speed]: (lines, monster) => {
    const line = combineToString(lines);
    const matches = [...line.matchAll(sbiRegex.speedDetails)];
    if (!matches.length) return;

    for (const match of matches) {
      const name = safeString(match.groups?.name, '').toLowerCase();
      const value = safeNumber(match.groups?.value, 0);
      if (!name || !value) continue;
      const key = name === 'speed' ? 'walk' : name;
      monster.speeds.push({ name: key, value });
      monster.speedAll[key] = value;
    }
  }
};

const setTopLevelDetails = (monster) => {
  if (!monster.type && monster.customType) {
    monster.type = monster.customType;
  }

  const noteLines = [];
  const traits = [...(monster.features || [])];

  if (monster.languages?.raw) {
    traits.push({ name: 'Languages', value: monster.languages.raw });
  }
  if (monster.savingThrows?.length) {
    traits.push({ name: 'Saving Throws', value: monster.savingThrows.join(', ') });
  }
  if (monster.senses?.length) {
    traits.push({ name: 'Senses', value: monster.senses.map((item) => `${item.name} ${item.value}`).join(', ') });
  }
  if (monster.skills?.length) {
    traits.push({ name: 'Skills', value: monster.skills.map((item) => `${item.name} ${item.value}`).join(', ') });
  }
  if (monster.conditionImmunities?.length) {
    traits.push({ name: 'Condition Immunities', value: monster.conditionImmunities.join(', ') });
  }
  if (monster.damageResistances?.length) {
    traits.push({ name: 'Damage Resistances', value: monster.damageResistances.join(', ') });
  }
  if (monster.damageVulnerabilities?.length) {
    traits.push({ name: 'Damage Vulnerabilities', value: monster.damageVulnerabilities.join(', ') });
  }
  if (monster.damageImmunities?.length) {
    traits.push({ name: 'Damage Immunities', value: monster.damageImmunities.join(', ') });
  }

  monster.features = traits;

  const additionalActions = [
    ...(monster.bonusActions || []),
    ...(monster.reactions || []),
    ...(monster.legendaryActions || []),
    ...(monster.lairActions || []),
    ...(monster.villainActions || [])
  ];

  if (monster.actions.length === 0 && additionalActions.length === 0 && monster.features.length === 0 && monster.desc.length === 0) {
    noteLines.push('No parsable special traits or actions were detected from this block.');
  }

  monster.allActions = [...monster.actions, ...additionalActions];
  return { noteLines, traits };
};

const parse5eStatblockToOpen5e = (rawText) => {
  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim());

  const nonEmpty = lines.filter((line) => line.length > 0);
  if (!nonEmpty.length) {
    return null;
  }

  const monster = new MonsterData(nonEmpty.shift());
  const statBlocks = new Map();
  let lastBlockId = null;
  let foundAbilityLine = false;
  let foundTopBlock = true;

  for (const line of nonEmpty) {
    const match = getFirstMatch(line, [...statBlocks.keys()]);

    if (!match && foundTopBlock && sbiRegex.blockTitle.exec(line)) {
      foundTopBlock = false;
      lastBlockId = BLOCK_IDS.features;
      if (!statBlocks.has(lastBlockId)) {
        statBlocks.set(lastBlockId, []);
      }
    }

    if (match) {
      foundTopBlock = TOP_BLOCK_IDS.includes(match.id);

      if (foundAbilityLine && match.id !== BLOCK_IDS.abilities) {
        foundAbilityLine = false;
      }

      if (!foundAbilityLine) {
        lastBlockId = match.id;
        if (!statBlocks.has(lastBlockId)) {
          statBlocks.set(lastBlockId, []);
        }
        foundAbilityLine = lastBlockId === BLOCK_IDS.abilities;
      }
    }

    if (line === 'Racial Details' && !statBlocks.has(BLOCK_IDS.race)) {
      lastBlockId = BLOCK_IDS.race;
      statBlocks.set(lastBlockId, []);
    }

    if (statBlocks.has(lastBlockId)) {
      statBlocks.get(lastBlockId).push(line);
    } else {
      monster.freeLines.push(line);
    }
  }

  // Fallback: treat first unmatched line as the type/alignment line if needed.
  if (!statBlocks.has(BLOCK_IDS.features) && monster.freeLines.length) {
    const maybeRacialLine = monster.freeLines.shift();
    getRacialDetails(maybeRacialLine, monster);
    if (monster.freeLines.length === 0) {
      monster.freeLines = [];
    }
  }

  for (const [key, value] of statBlocks.entries()) {
    const setter = applySetters[key] || (key === 'race' ? (lines, m) => getRacialDetails(lines.join(' '), m) : null);
    if (setter) {
      setter(value, monster);
    }
  }

  setTopLevelDetails(monster);

  const movement = monster.speedAll;
  const allActions = [...(monster.actions || []), ...(monster.allActions || [])];

  const abilityScores = {
    strength: safeNumber(monster.abilities.str, 10),
    dexterity: safeNumber(monster.abilities.dex, 10),
    constitution: safeNumber(monster.abilities.con, 10),
    intelligence: safeNumber(monster.abilities.int, 10),
    wisdom: safeNumber(monster.abilities.wis, 10),
    charisma: safeNumber(monster.abilities.cha, 10)
  };

  const challengeValue = monster.challenge?.cr ?? 0;
  const normalized = {
    name: safeString(monster.name, 'Unknown Monster'),
    key: makeSlug(monster.name),
    slug: makeSlug(monster.name),
    alignment: safeString(monster.alignment, 'unaligned'),
    size: safeString(monster.size, 'Medium'),
    type: safeString(monster.type, 'humanoid'),
    armor_class: safeNumber(monster.armor?.ac, 10),
    hit_points: safeNumber(monster.health?.value, 0),
    challenge_rating_decimal: safeNumber(challengeValue, 0),
    challenge_rating_text: String(challengeValue || 0),
    speed_all: movement,
    ability_scores: abilityScores,
    desc: [
      monster.freeLines.join(' '),
      monster.desc.join(' '),
      monster.languages?.raw,
    ].filter(Boolean).join(' '),
    traits: (monster.features || []).map((entry) => ({
      name: safeString(entry.name, 'Trait'),
      desc: safeString(entry.value, '')
    })),
    actions: allActions.map((entry) => ({
      name: safeString(entry.name, 'Action'),
      desc: safeString(entry.value, '')
    })),
    source: {
      name: 'Manual 5E Statblock',
      key: 'manual-5e-statblock',
      display_name: 'Manual 5E Statblock',
      type: 'SOURCE'
    },
    document: {
      name: 'Manual 5E Statblock Import',
      key: 'manual-5e-statblock',
      display_name: 'Manual 5E Statblock Import',
      type: 'SOURCE'
    },
    illustration: PARSER_FALLBACK_ICON,
    url: '',
    sourceUrl: '',
    rawSource: monster
  };

  return normalized;
};

const parse5eStatblockInputToResult = (rawText) => {
  const importerResult = parseStatblockWithImporter(rawText);
  if (importerResult) {
    return importerResult;
  }

  const monster = parse5eStatblockToOpen5e(rawText);
  if (!monster) {
    return null;
  }

  const lines = String(rawText || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => line.trim());

  return {
    actor: monster,
    lines,
    unknownLines: [],
    statBlocks: new Map(),
  };
};

const api = {
  parseText: parse5eStatblockToOpen5e,
  parseInput: parse5eStatblockInputToResult,
  parse: parse5eStatblockToOpen5e
};

globalThis.MonsterCreator5eStatblockParser = api;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
