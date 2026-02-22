const MONSTER_CREATOR_ID = 'monster-creator';
const FALLBACK_ICON = 'icons/svg/mystery-man.svg';
const SPEED_KEYS = {
  walk: 'walk',
  fly: 'fly',
  swim: 'swim',
  climb: 'climb',
  burrow: 'burrow',
  crawl: 'crawl'
};

const SPEED_KEY_LIST = Object.keys(SPEED_KEYS);

const hasMovementShape = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return SPEED_KEY_LIST.some((key) => Object.prototype.hasOwnProperty.call(value, key));
};

function safeNumber(value, fallback = 0) {
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
    const cleaned = value.trim();
    if (!cleaned) {
      return fallback;
    }

    const fractionMatch = cleaned.match(/^\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))\s*\/\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))/);
    if (fractionMatch) {
      const parsedNumerator = Number(fractionMatch[1]);
      const parsedDenominator = Number(fractionMatch[2]);
      if (Number.isFinite(parsedNumerator) && Number.isFinite(parsedDenominator) && parsedDenominator !== 0) {
        return parsedNumerator / parsedDenominator;
      }
    }

    const inlineNumberMatch = cleaned.match(/^\s*([-+]?(?:\d+(?:\.\d+)?|\.\d+))/);
    if (inlineNumberMatch) {
      const parsed = Number(inlineNumberMatch[1]);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeString(value, fallback = '') {
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

    return fallback;
  }

  const str = String(value);
  return str === '' ? fallback : str;
}

function normalizeText(value) {
  if (value === undefined || value === null) return '';

  return safeString(value, '')
    .replace(/\u2022/g, ' ')
    .replace(/_+/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeAbilityValue(value, fallback = 10) {
  const parsed = safeNumber(value, fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toAbilityScores(input = {}) {
  return {
    str: { value: normalizeAbilityValue(input.strength, 10) },
    dex: { value: normalizeAbilityValue(input.dexterity, 10) },
    con: { value: normalizeAbilityValue(input.constitution, 10) },
    int: { value: normalizeAbilityValue(input.intelligence, 10) },
    wis: { value: normalizeAbilityValue(input.wisdom, 10) },
    cha: { value: normalizeAbilityValue(input.charisma, 10) }
  };
}

function normalizeFeatureList(input = [], fallbackName = '') {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => {
      const name = safeString(entry?.name, fallbackName);
      const desc = normalizeText(entry?.desc);
      if (!name && !desc) return null;
      return { name, desc };
    })
    .filter(Boolean);
}

function normalizeNamesFromOpen5eList(value = []) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => safeString(entry?.name, safeString(entry?.display_name, entry?.key)))
    .filter(Boolean);
}

function normalizeOpen5eKeyValueList(values = {}) {
  const toTitleCase = (text) => String(text)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join(' ');

  return Object.entries(values || {})
    .map(([name, value]) => ({
      name: toTitleCase(normalizeText(String(name).replaceAll('_', ' '))),
      value: safeNumber(value, NaN)
    }))
    .filter((entry) => Number.isFinite(entry.value))
    .map((entry) => {
      const sign = entry.value >= 0 ? '+' : '';
      return `${entry.name} ${sign}${entry.value}`;
    });
}

function toTitleCase(value = '') {
  return String(value)
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`)
    .join(' ');
}

function normalizeAbilityModifier(score = 10) {
  const parsedScore = safeNumber(score, 10);
  const modifier = Math.floor((parsedScore - 10) / 2);
  return `${modifier >= 0 ? '+' : ''}${modifier}`;
}

function normalizeDescriptionText(value = '') {
  return normalizeText(value)
    .replace(/\n+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatSignedInteger(value) {
  const parsed = safeNumber(value, 0);
  return `${parsed >= 0 ? '+' : ''}${Math.trunc(parsed)}`;
}

function safeDieSides(value, fallback = 0) {
  const normalized = safeString(value, '');
  if (!normalized) {
    return NaN;
  }

  const match = normalized.match(/\d+/);
  if (!match) {
    return NaN;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDiceFormula(count, die, bonus = 0) {
  const safeCount = safeNumber(count, 0);
  const safeBonus = safeNumber(bonus, 0);
  const safeDie = safeDieSides(die, NaN);

  if (!Number.isFinite(safeCount) || !Number.isFinite(safeDie) || safeCount <= 0 || safeDie <= 0) {
    return '';
  }

  const roundedCount = Math.trunc(safeCount);
  const fixedBonus = roundedCount === 0 ? 0 : safeBonus;
  if (roundedCount <= 0) {
    return '';
  }

  const sign = fixedBonus >= 0 ? ` + ${Math.trunc(fixedBonus)}` : ` - ${Math.abs(Math.trunc(fixedBonus))}`;
  return `${roundedCount}d${safeDie}${fixedBonus === 0 ? '' : sign}`;
}

function damageComponentAverage(count, die, bonus = 0) {
  const safeCount = Math.trunc(safeNumber(count, 0));
  const safeBonus = safeNumber(bonus, 0);
  const safeDie = safeDieSides(die, NaN);

  if (!Number.isFinite(safeCount) || !Number.isFinite(safeDie) || safeCount <= 0 || safeDie <= 0) {
    return NaN;
  }

  const avg = safeCount * (safeDie + 1) / 2 + safeBonus;
  return avg;
}

function formatDamageAverage(average) {
  if (!Number.isFinite(average)) {
    return '';
  }

  const rounded = Number.parseFloat(average.toFixed(1));
  return Number.isInteger(rounded)
    ? String(Math.trunc(rounded))
    : String(rounded);
}

function proficiencyByChallenge(challenge) {
  const cr = safeNumber(challenge, 0);

  if (cr >= 0 && cr <= 4) return 2;
  if (cr <= 8) return 3;
  if (cr <= 12) return 4;
  if (cr <= 16) return 5;
  if (cr <= 20) return 6;
  if (cr <= 24) return 7;
  if (cr <= 28) return 8;
  return 9;
}

function challengeXpForValue(challenge) {
  const cr = safeNumber(challenge, 0);
  const xpTable = {
    0: 10,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000
  };

  return Object.prototype.hasOwnProperty.call(xpTable, cr) ? xpTable[cr] : 0;
}

function normalizeChallengeText(value) {
  if (value === undefined || value === null) {
    return '0';
  }

  if (typeof value === 'string' && value.includes('/')) {
    return value.trim();
  }

  const parsed = safeNumber(value, 0);
  if (!Number.isFinite(parsed)) {
    return '0';
  }

  if (parsed === 0.125) return '1/8';
  if (parsed === 0.25) return '1/4';
  if (parsed === 0.5) return '1/2';

  return Number.isInteger(parsed)
    ? String(parsed)
    : parsed.toString();
}

function mergeWotcSectionLine(existing, value) {
  const incoming = normalizeDescriptionText(value);
  if (!incoming) {
    return;
  }

  if (!existing.includes(incoming)) {
    existing.push(incoming);
  }
}

function ensureSentence(text = '') {
  const normalized = normalizeDescriptionText(text);
  if (!normalized) {
    return '';
  }

  return /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
}

function normalizeMonsterSizeForWotc(value = '') {
  const size = safeString(value, '').toLowerCase();
  const normalized = {
    tiny: 'Tiny',
    sm: 'Small',
    med: 'Medium',
    lg: 'Large',
    huge: 'Huge',
    grg: 'Gargantuan',
    gigantic: 'Gargantuan'
  };

  return normalized[size] || toTitleCase(value);
}

function movementToText(movement = {}) {
  const keys = ['walk', 'fly', 'swim', 'climb', 'burrow', 'crawl'];
  const parts = [];
  const included = [];

  keys.forEach((key) => {
    const source = movement?.[key];
    const value = safeNumber(source?.value ?? source, NaN);
    if (!Number.isFinite(value) || value < 0) {
      return;
    }

    const displayValue = `${value} ft.`;
    const label = key === 'walk' ? '' : `${toTitleCase(key)} `;
    parts.push(`${label}${displayValue}`.trim());
    included.push(key);
  });

  if (!parts.length) {
    return '30 ft.';
  }

  if (!included.includes('walk')) {
    return parts.join(', ');
  }

  if (parts.length === 1) {
    return parts[0].replace(/^walk\s+/i, '');
  }

  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/^walk\s+/i, '');
      }
      return part;
    })
    .join(', ');
}

function normalizeWotcTraits(traits = []) {
  const remaining = [];
  const special = {
    savingThrows: [],
    skills: [],
    vulnerabilities: [],
    resistances: [],
    immunities: [],
    conditionImmunities: [],
    senses: [],
    languages: []
  };

  traits.forEach((trait) => {
    const name = toTitleCase(safeString(trait?.name, ''));
    const desc = normalizeDescriptionText(trait?.desc || '');
    const key = name.toLowerCase();

    if (!name) {
      return;
    }

    if (key === 'saving throws') {
      mergeWotcSectionLine(special.savingThrows, desc);
      return;
    }
    if (key === 'skills') {
      mergeWotcSectionLine(special.skills, desc);
      return;
    }
    if (key === 'damage vulnerabilities') {
      mergeWotcSectionLine(special.vulnerabilities, desc);
      return;
    }
    if (key === 'damage resistances') {
      mergeWotcSectionLine(special.resistances, desc);
      return;
    }
    if (key === 'damage immunities') {
      mergeWotcSectionLine(special.immunities, desc);
      return;
    }
    if (key === 'condition immunities') {
      mergeWotcSectionLine(special.conditionImmunities, desc);
      return;
    }
    if (key === 'senses') {
      mergeWotcSectionLine(special.senses, desc);
      return;
    }
    if (key === 'languages') {
      mergeWotcSectionLine(special.languages, desc);
      return;
    }

    if (desc) {
      remaining.push({ name, desc });
    } else {
      remaining.push({ name });
    }
  });

  return { remaining, special };
}

function renderNameValueLines(traitsText = '') {
  return normalizeDescriptionText(traitsText);
}

function normalizeMonsterShapeForWotc(monster = {}) {
  if (!monster || typeof monster !== 'object') {
    return {};
  }

  const source = monster?.system && monster?.system?.abilities ? monster : null;
  const isActorPayload = Boolean(source);

  if (isActorPayload) {
    const notes = normalizeText(monster?.flags?.['monster-creator']?.notes);
    const traits = [];
    const actions = normalizeFeatureList(monster?.system?.actions, 'Action');
    const bonusActions = normalizeFeatureList(monster?.system?.bonus_actions, 'Bonus Action');
    const reactions = normalizeFeatureList(monster?.system?.reactions, 'Reaction');
    const legendaryActions = normalizeFeatureList(monster?.system?.legendary_actions, 'Legendary Action');
    const mythicActions = normalizeFeatureList(monster?.system?.mythic_actions, 'Mythic Action');
    const lairActions = normalizeFeatureList(monster?.system?.lair_actions, 'Lair Action');
    const regionalEffects = normalizeFeatureList(monster?.system?.regional_effects, 'Regional Effect');
    const open5eSourceRaw = monster?.flags?.[MONSTER_CREATOR_ID]?.open5e?.raw;
    const open5eSource = open5eSourceRaw ? normalizeOpen5eMonster(open5eSourceRaw) : null;

    if (notes) {
      traits.push({ name: 'Notes', desc: notes });
    }

    if (!traits.length && open5eSource?.traits?.length) {
      traits.push(...open5eSource.traits);
    }
    if (!actions.length && open5eSource?.actions?.length) {
      actions.push(...open5eSource.actions);
    }
    if (!bonusActions.length && open5eSource?.bonusActions?.length) {
      bonusActions.push(...open5eSource.bonusActions);
    }
    if (!reactions.length && open5eSource?.reactions?.length) {
      reactions.push(...open5eSource.reactions);
    }
    if (!legendaryActions.length && open5eSource?.legendaryActions?.length) {
      legendaryActions.push(...open5eSource.legendaryActions);
    }
    if (!mythicActions.length && open5eSource?.mythicActions?.length) {
      mythicActions.push(...open5eSource.mythicActions);
    }
    if (!lairActions.length && open5eSource?.lairActions?.length) {
      lairActions.push(...open5eSource.lairActions);
    }
    if (!regionalEffects.length && open5eSource?.regionalEffects?.length) {
      regionalEffects.push(...open5eSource.regionalEffects);
    }

    return {
      name: safeString(monster.name, 'New Monster'),
      key: safeString(monster.key, safeString(monster.slug, '')),
      slug: safeString(monster.slug, safeString(monster.key, '')),
      sourceUrl: safeString(monster.sourceUrl, ''),
      alignment: safeString(monster.system?.details?.alignment?.value, 'unaligned'),
      size: safeString(monster.system?.size || monster.size, 'Medium'),
      type: safeString(monster.system?.details?.type?.value, 'humanoid'),
      ac: safeNumber(monster.system?.attributes?.ac?.value, 10),
      hp: safeNumber(monster.system?.attributes?.hp?.value, 0),
      hpDice: safeString(monster.system?.attributes?.hp?.formula, ''),
      challenge: safeNumber(monster.system?.details?.cr?.value ?? monster.system?.details?.cr, 0),
      challengeText: safeString(monster.system?.details?.cr?.text, safeString(monster.system?.details?.cr?.value, '')),
      proficiencyBonus: safeNumber(monster.system?.details?.proficiency_bonus, NaN),
      experiencePoints: safeNumber(monster.system?.details?.experience_points, NaN),
      speed: monster.system?.attributes?.movement || {},
      abilityScores: {
        str: { value: safeNumber(monster.system?.abilities?.str?.value, 10) },
        dex: { value: safeNumber(monster.system?.abilities?.dex?.value, 10) },
        con: { value: safeNumber(monster.system?.abilities?.con?.value, 10) },
        int: { value: safeNumber(monster.system?.abilities?.int?.value, 10) },
        wis: { value: safeNumber(monster.system?.abilities?.wis?.value, 10) },
        cha: { value: safeNumber(monster.system?.abilities?.cha?.value, 10) }
      },
      traits,
      actions,
      bonusActions,
      reactions,
      legendaryActions,
      mythicActions,
      lairActions,
      regionalEffects,
      sourceInfo: monster.sourceInfo || null,
      rawSource: monster
    };
  }

  const isOpen5eMonster = (
    Object.prototype.hasOwnProperty.call(monster, 'ability_scores') ||
    Object.prototype.hasOwnProperty.call(monster, 'armor_class') ||
    Object.prototype.hasOwnProperty.call(monster, 'hit_points') ||
    Object.prototype.hasOwnProperty.call(monster, 'challenge_rating_decimal') ||
    Object.prototype.hasOwnProperty.call(monster, 'challenge_rating_text') ||
    Object.prototype.hasOwnProperty.call(monster, 'speed_all') ||
    Object.prototype.hasOwnProperty.call(monster, 'speed')
  );

  if (isOpen5eMonster) {
    return normalizeOpen5eMonster(monster);
  }

  if ('abilityScores' in monster || 'alignment' in monster || 'challenge' in monster) {
    return {
      name: safeString(monster.name, 'Unknown Monster'),
      key: safeString(monster.key, safeString(monster.slug, '')),
      slug: safeString(monster.slug, safeString(monster.key, '')),
      sourceUrl: safeString(monster.sourceUrl, ''),
      alignment: safeString(monster.alignment, 'unaligned'),
      size: safeString(monster.size, ''),
      type: safeString(monster.type, ''),
      ac: safeNumber(monster.ac, 10),
      hp: safeNumber(monster.hp, 0),
      hpDice: safeString(monster.hpDice, ''),
      proficiencyBonus: safeNumber(monster.proficiencyBonus, NaN),
      experiencePoints: safeNumber(monster.experiencePoints, NaN),
      challenge: safeNumber(monster.challenge, 0),
      challengeText: safeString(monster.challengeText, ''),
      speed: monster.speed || {},
      abilityScores: {
        str: monster.abilityScores?.str || { value: safeNumber(monster.str, 10) },
        dex: monster.abilityScores?.dex || { value: safeNumber(monster.dex, 10) },
        con: monster.abilityScores?.con || { value: safeNumber(monster.con, 10) },
        int: monster.abilityScores?.int || { value: safeNumber(monster.int, 10) },
        wis: monster.abilityScores?.wis || { value: safeNumber(monster.wis, 10) },
        cha: monster.abilityScores?.cha || { value: safeNumber(monster.cha, 10) }
      },
      traits: Array.isArray(monster.traits) ? monster.traits : [],
      actions: Array.isArray(monster.actions) ? monster.actions : [],
      bonusActions: Array.isArray(monster.bonusActions) ? monster.bonusActions : [],
      reactions: Array.isArray(monster.reactions) ? monster.reactions : [],
      legendaryActions: Array.isArray(monster.legendaryActions) ? monster.legendaryActions : [],
      mythicActions: Array.isArray(monster.mythicActions) ? monster.mythicActions : [],
      lairActions: Array.isArray(monster.lairActions) ? monster.lairActions : [],
      regionalEffects: Array.isArray(monster.regionalEffects) ? monster.regionalEffects : [],
      sourceInfo: monster.sourceInfo || null,
      rawSource: monster.rawSource || null
    };
  }

  return normalizeOpen5eMonster(monster);
}

function formatActionLines(entries = [], fallbackLabel = '') {
  if (!Array.isArray(entries) || !entries.length) {
    return [];
  }

  return entries
    .map((entry) => {
      const name = toTitleCase(safeString(entry?.name, fallbackLabel));
      const desc = ensureSentence(entry?.desc || '');
      if (!name) return '';
      if (!desc) return `${name}.`;
      return `${name}. ${desc}`;
    })
    .filter(Boolean);
}

function toWotcStatblockText(monster = {}) {
  const normalized = normalizeMonsterShapeForWotc(monster);
  const normalizedTraits = normalizeWotcTraits(normalized.traits || []);
  const special = normalizedTraits.special || {};
  const traitLines = normalizedTraits.remaining || [];

  const lines = [];
  lines.push(safeString(normalized.name, 'Unknown Monster'));
  lines.push(`${normalizeMonsterSizeForWotc(normalized.size || 'Medium')} ${toTitleCase(safeString(normalized.type, 'Humanoid'))}, ${safeString(normalized.alignment, 'unaligned')}`);
  const acSource = normalizeDescriptionText(
    normalized.sourceInfo?.armor_desc ||
    normalized.sourceInfo?.armor_detail ||
    normalized.sourceInfo?.armorClassDesc ||
    normalized.acDesc ||
    normalized.armor_desc ||
    ''
  );
  lines.push(`Armor Class ${safeNumber(normalized.ac, 10)}${acSource ? ` (${acSource})` : ''}`);
  const hpFormula = safeString(normalized.hpDice, '');
  lines.push(`Hit Points ${safeNumber(normalized.hp, 0)}${hpFormula ? ` (${normalizeText(hpFormula)})` : ''}`);
  lines.push(`Speed ${movementToText(normalized.speed || {})}`);
  lines.push(
    `STR ${safeNumber(normalized.abilityScores?.str?.value, 10)} (${normalizeAbilityModifier(normalized.abilityScores?.str?.value)})` +
    `  DEX ${safeNumber(normalized.abilityScores?.dex?.value, 10)} (${normalizeAbilityModifier(normalized.abilityScores?.dex?.value)})` +
    `  CON ${safeNumber(normalized.abilityScores?.con?.value, 10)} (${normalizeAbilityModifier(normalized.abilityScores?.con?.value)})` +
    `  INT ${safeNumber(normalized.abilityScores?.int?.value, 10)} (${normalizeAbilityModifier(normalized.abilityScores?.int?.value)})` +
    `  WIS ${safeNumber(normalized.abilityScores?.wis?.value, 10)} (${normalizeAbilityModifier(normalized.abilityScores?.wis?.value)})` +
    `  CHA ${safeNumber(normalized.abilityScores?.cha?.value, 10)} (${normalizeAbilityModifier(normalized.abilityScores?.cha?.value)})`
  );

  const optionalLines = [];
  const appendIfExists = (label, entries, fallback = '') => {
    const value = (entries || []).filter(Boolean).join(', ');
    if (value) {
      optionalLines.push(`${label} ${value}`);
    } else if (fallback) {
      optionalLines.push(`${label} ${fallback}`);
    }
  };

  appendIfExists('Saving Throws', special.savingThrows);
  appendIfExists('Skills', special.skills);
  appendIfExists('Damage Vulnerabilities', special.vulnerabilities);
  appendIfExists('Damage Resistances', special.resistances);
  appendIfExists('Damage Immunities', special.immunities);
  appendIfExists('Condition Immunities', special.conditionImmunities);
  appendIfExists('Senses', special.senses);
  appendIfExists('Languages', special.languages);

  const challengeText = normalizeChallengeText(
    safeString(normalized.challengeText, normalized.challenge)
  );
  const challengeValue = safeNumber(normalized.challenge, 0);
  const challengeXp = safeNumber(normalized.experiencePoints, challengeXpForValue(challengeValue));
  lines.push(`Challenge ${challengeText} (${safeNumber(challengeXp, 0)} XP)`);
  const proficiency = Number.isFinite(safeNumber(normalized.proficiencyBonus, NaN))
    ? safeNumber(normalized.proficiencyBonus, 0)
    : proficiencyByChallenge(challengeValue);
  lines.push(`Proficiency Bonus ${formatSignedInteger(proficiency)}`);

  if (optionalLines.length) {
    lines.push('');
    lines.push(...optionalLines);
  }

  if (traitLines.length) {
    lines.push('');
    lines.push('Traits');
    lines.push(...formatActionLines(traitLines));
  }

  const actionLines = formatActionLines(normalized.actions || [], 'Action');
  if (actionLines.length) {
    lines.push('');
    lines.push('Actions');
    lines.push(...actionLines);
  }

  const bonusActionLines = formatActionLines(normalized.bonusActions || [], 'Bonus Action');
  if (bonusActionLines.length) {
    lines.push('');
    lines.push('Bonus Actions');
    lines.push(...bonusActionLines);
  }

  const reactionLines = formatActionLines(normalized.reactions || [], 'Reaction');
  if (reactionLines.length) {
    lines.push('');
    lines.push('Reactions');
    lines.push(...reactionLines);
  }

  const legendaryLines = formatActionLines(normalized.legendaryActions || normalized.legendary_actions || [], 'Legendary Action');
  if (legendaryLines.length) {
    lines.push('');
    lines.push('Legendary Actions');
    lines.push('The creature can take 3 legendary actions, choosing from the options below. Only one legendary action option can be used at a time and only at the end of another creature’s turn. The creature regains spent legendary actions at the start of its turn.');
    lines.push(...legendaryLines);
  }

  const mythicLines = formatActionLines(normalized.mythicActions || [], 'Mythic Action');
  if (mythicLines.length) {
    lines.push('');
    lines.push('Mythic Actions');
    lines.push(...mythicLines);
  }

  const lairLines = formatActionLines(normalized.lairActions || [], 'Lair Action');
  if (lairLines.length) {
    lines.push('');
    lines.push('Lair Actions');
    lines.push(...lairLines);
  }

  const regionalLines = formatActionLines(normalized.regionalEffects || [], 'Regional Effect');
  if (regionalLines.length) {
    lines.push('');
    lines.push('Regional Effects');
    lines.push(...regionalLines);
  }

  return lines.join('\n').trim();
}

function normalizeOpen5eLanguages(sourceLanguages) {
  if (!sourceLanguages || typeof sourceLanguages !== 'object') {
    return '';
  }

  const asString = safeString(sourceLanguages.as_string, '');
  if (asString) {
    return asString;
  }

  const list = normalizeNamesFromOpen5eList(sourceLanguages.data);
  return list.join(', ');
}

function normalizeOpen5eSenses(source) {
  const entries = [];
  const normal = safeNumber(source?.normal_sight_range, NaN);
  const darkvision = safeNumber(source?.darkvision_range, NaN);
  const blindsight = safeNumber(source?.blindsight_range, NaN);
  const tremorsense = safeNumber(source?.tremorsense_range, NaN);
  const truesight = safeNumber(source?.truesight_range, NaN);
  const passive = safeNumber(source?.passive_perception, NaN);

  if (Number.isFinite(darkvision)) {
    entries.push(`Darkvision ${darkvision} ft.`);
  }
  if (Number.isFinite(blindsight)) {
    entries.push(`Blindsight ${blindsight} ft.`);
  }
  if (Number.isFinite(tremorsense)) {
    entries.push(`Tremorsense ${tremorsense} ft.`);
  }
  if (Number.isFinite(truesight)) {
    entries.push(`Truesight ${truesight} ft.`);
  }
  if (Number.isFinite(passive)) {
    entries.push(`Passive Perception ${passive}`);
  }
  if (Number.isFinite(normal)) {
    entries.push(`Normal Sight ${normal} ft.`);
  }

  return entries;
}

function normalizeOpen5eResistancesAndImmunities(source = {}) {
  const resistanceValues = source || {};
  const lines = [];
  const fromDisplay = [];

  if (safeString(resistanceValues.damage_immunities_display, '')) {
    fromDisplay.push(`Damage Immunities: ${safeString(resistanceValues.damage_immunities_display, '')}`);
  }
  if (safeString(resistanceValues.damage_resistances_display, '')) {
    fromDisplay.push(`Damage Resistances: ${safeString(resistanceValues.damage_resistances_display, '')}`);
  }
  if (safeString(resistanceValues.damage_vulnerabilities_display, '')) {
    fromDisplay.push(`Damage Vulnerabilities: ${safeString(resistanceValues.damage_vulnerabilities_display, '')}`);
  }
  if (safeString(resistanceValues.condition_immunities_display, '')) {
    fromDisplay.push(`Condition Immunities: ${safeString(resistanceValues.condition_immunities_display, '')}`);
  }

  lines.push(...fromDisplay);

  const resistances = normalizeNamesFromOpen5eList(resistanceValues.damage_resistances).join(', ');
  const immunities = normalizeNamesFromOpen5eList(resistanceValues.damage_immunities).join(', ');
  const vulnerabilities = normalizeNamesFromOpen5eList(resistanceValues.damage_vulnerabilities).join(', ');
  const conditionImmunities = normalizeNamesFromOpen5eList(resistanceValues.condition_immunities).join(', ');

  if (immunities) lines.push(`Damage Immunities: ${immunities}`);
  if (resistances) lines.push(`Damage Resistances: ${resistances}`);
  if (vulnerabilities) lines.push(`Damage Vulnerabilities: ${vulnerabilities}`);
  if (conditionImmunities) lines.push(`Condition Immunities: ${conditionImmunities}`);

  const deduped = [];
  const seen = new Set();

  for (const line of lines) {
    const normalizedLine = String(line).trim();
    if (!normalizedLine) {
      continue;
    }

    const lookup = normalizedLine.toLowerCase();
    if (seen.has(lookup)) {
      continue;
    }

    deduped.push(normalizedLine);
    seen.add(lookup);
  }

  return deduped;
}

function toMovement(input = {}) {
  let sourceSpeed = {};
  if (input && typeof input === 'object') {
    if (Object.prototype.hasOwnProperty.call(input, 'speed_all')) {
      sourceSpeed = input.speed_all;
    } else if (Object.prototype.hasOwnProperty.call(input, 'speed') && hasMovementShape(input.speed)) {
      sourceSpeed = input.speed;
    } else if (hasMovementShape(input)) {
      sourceSpeed = input;
    }
  }

  if (!sourceSpeed || typeof sourceSpeed !== 'object') return {};

  const movement = {};

  for (const key of Object.keys(SPEED_KEYS)) {
    if (!Object.prototype.hasOwnProperty.call(sourceSpeed, key)) continue;

    const raw = sourceSpeed[key];
    if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') {
      continue;
    }

    const parsed = safeNumber(raw, NaN);

    if (Number.isFinite(parsed) && parsed >= 0) {
      movement[key] = { value: parsed };
    }
  }

  return movement;
}

function normalizeOpen5eActionType(action) {
  const type = safeString(action?.action_type, '').toUpperCase();
  if (type === 'BONUS_ACTION') return 'bonus';
  if (type === 'REACTION') return 'reaction';
  if (type === 'LEGENDARY_ACTION') return 'legendary';
  if (type === 'LAIR_ACTION') return 'lair';
  if (type === 'MYTHIC_ACTION') return 'mythic';
  return 'action';
}

function normalizeOpen5eAction(action) {
  const name = safeString(action?.name, 'Action');
  const description = normalizeDescriptionText(action?.desc);
  const fromAttacks = Array.isArray(action?.attacks) ? action.attacks : [];
  if (description) {
    return { name, desc: description };
  }

  if (!fromAttacks.length) {
    return { name, desc: '' };
  }

  const attackLines = fromAttacks.map((attack = {}) => {
    const attackType = safeString(attack.attack_type, '').toLowerCase();
    const toHit = safeNumber(attack.to_hit_mod, NaN);
    const reach = safeNumber(attack.reach, NaN);
    const range = safeNumber(attack.range, NaN);
    const longRange = safeNumber(attack.long_range, NaN);
    const unit = safeString(attack.distance_unit, 'feet');
    const unitSuffix = unit === 'feet' || unit === 'ft' ? 'ft.' : String(unit);

    const primaryType = safeString(attack.damage_type?.name, attack.damage_type, attack.damage_type_name, '');
    const primaryCount = safeNumber(attack.damage_die_count, 0);
    const primaryDie = safeString(attack.damage_die_type, '');
    const primaryBonus = safeNumber(attack.damage_bonus, 0);
    const extraType = safeString(attack.extra_damage_type?.name, attack.extra_damage_type, attack.extra_damage_type_name, '');
    const extraCount = safeNumber(attack.extra_damage_die_count, 0);
    const extraDie = safeString(attack.extra_damage_die_type, '');
    const extraBonus = safeNumber(attack.extra_damage_bonus, 0);
    const resolvedPrimaryType = primaryType || extraType;

    const isSpell = attackType.includes('spell');
    const isRanged = Number.isFinite(range) && range > 0 && (!Number.isFinite(reach) || reach <= 0);
    const attackLabel = `${isRanged ? 'Ranged' : 'Melee'} ${isSpell ? 'Spell' : 'Weapon'} Attack`;

    const distance = Number.isFinite(reach) && reach > 0
      ? `reach ${reach} ${unitSuffix}`
      : Number.isFinite(range) && range > 0
        ? `range ${range}${Number.isFinite(longRange) && longRange > 0 ? `/${longRange}` : ''} ${unitSuffix}`
        : '';

    const parts = [attackLabel];
    if (Number.isFinite(toHit)) {
      parts.push(`${formatSignedInteger(toHit)} to hit`);
    }
    if (distance) {
      parts.push(distance);
    }

    const label = parts[0];
    const tail = parts.slice(1).join(', ');
    const targetClause = Number.isFinite(toHit) ? ', one target.' : '.';
    const coreLine = `${label}${tail ? `: ${tail}` : ''}${targetClause}`.trim();

    const components = [];
    const primaryFormula = formatDiceFormula(primaryCount, primaryDie, primaryBonus);
    if (primaryFormula) {
      const primaryAverage = damageComponentAverage(primaryCount, primaryDie, primaryBonus);
      components.push({
        avg: primaryAverage,
        formula: primaryFormula,
        type: resolvedPrimaryType || 'damage'
      });
    }

    const extraFormula = formatDiceFormula(extraCount, extraDie, extraBonus);
    if (extraFormula) {
      const extraAverage = damageComponentAverage(extraCount, extraDie, extraBonus);
      components.push({
        avg: extraAverage,
        formula: extraFormula,
        type: (primaryType ? extraType : '') || 'damage'
      });
    }

    if (!components.length) {
      return coreLine;
    }

    const primary = components[0];
    const baseAvg = formatDamageAverage(primary.avg);
    if (Number.isNaN(primary.avg)) {
      return coreLine;
    }

    const extraLines = components.slice(1).map((entry) => {
      const extraAverage = formatDamageAverage(entry.avg);
      if (!entry.type || !extraAverage || !entry.formula) {
        return '';
      }

      return ` It deals ${extraAverage} (${entry.formula}) ${entry.type} damage as well.`;
    }).filter(Boolean);

    return `${coreLine} Hit: ${baseAvg} (${primary.formula}) ${primary.type} damage.${extraLines.join('')}`;
  });

  return { name, desc: attackLines.join(' ') };
}

function mergeOpen5eActionsByType(actions = []) {
  const grouped = {
    action: [],
    bonus: [],
    reaction: [],
    legendary: [],
    lair: [],
    mythic: []
  };

  if (!Array.isArray(actions)) {
    return grouped;
  }

  actions.forEach((action) => {
    const normalized = normalizeOpen5eAction(action);
    const type = normalizeOpen5eActionType(action);
    const lowerName = safeString(normalized.name, '').toLowerCase();
    if (/^the .+ can take \d+\s+legendary actions?/i.test(lowerName)) {
      return;
    }

    switch (type) {
      case 'bonus':
        grouped.bonus.push(normalized);
        break;
      case 'reaction':
        grouped.reaction.push(normalized);
        break;
      case 'legendary':
        grouped.legendary.push(normalized);
        break;
      case 'lair':
        grouped.lair.push(normalized);
        break;
      case 'mythic':
        grouped.mythic.push(normalized);
        break;
      default:
        grouped.action.push(normalized);
    }
  });

  return grouped;
}

const SBI_TO_OPEN5E_ABILITY_MAP = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma'
};

const SBI_SPEED_KEY_MAP = {
  land: 'walk',
  speed: 'walk'
};

function escapeRegExp(value = '') {
  return safeString(value, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSbiAbilityShortName(value = '') {
  const normalized = safeString(value, '').toLowerCase().trim();
  if (!normalized) {
    return '';
  }

  if (['str', 'strength'].includes(normalized) || normalized.startsWith('str ')) {
    return 'str';
  }
  if (['dex', 'dexterity'].includes(normalized) || normalized.startsWith('dex ')) {
    return 'dex';
  }
  if (['con', 'constitution'].includes(normalized) || normalized.startsWith('con ')) {
    return 'con';
  }
  if (['int', 'intelligence'].includes(normalized) || normalized.startsWith('int ')) {
    return 'int';
  }
  if (['wis', 'wisdom'].includes(normalized) || normalized.startsWith('wis ')) {
    return 'wis';
  }
  if (['cha', 'charisma'].includes(normalized) || normalized.startsWith('cha ')) {
    return 'cha';
  }

  return '';
}

function normalizeSbiAbilityScores(abilities = []) {
  const fallback = {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  };

  if (!Array.isArray(abilities)) {
    const objectSource = abilities || {};
    return {
      strength: safeNumber(objectSource.strength, fallback.strength),
      dexterity: safeNumber(objectSource.dexterity, fallback.dexterity),
      constitution: safeNumber(objectSource.constitution, fallback.constitution),
      intelligence: safeNumber(objectSource.intelligence, fallback.intelligence),
      wisdom: safeNumber(objectSource.wisdom, fallback.wisdom),
      charisma: safeNumber(objectSource.charisma, fallback.charisma)
    };
  }

  for (const entry of abilities) {
    const short = normalizeSbiAbilityShortName(entry?.name);
    const full = SBI_TO_OPEN5E_ABILITY_MAP[short];
    if (!full || !short) {
      continue;
    }
    fallback[full] = safeNumber(entry?.value, fallback[full]);
  }

  return fallback;
}

function normalizeSbiEntryText(value) {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).trim();
  }
  if (Array.isArray(value?.lines)) {
    return value.lines.map((line) => safeString(line?.line, '')).join(' ');
  }
  if (typeof value?.desc === 'string') {
    return safeString(value.desc, '');
  }
  if (typeof value?.text === 'string') {
    return safeString(value.text, '');
  }

  return '';
}

function normalizeSbiNameValueList(entries = [], fallbackName = '') {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      const name = safeString(entry?.name, fallbackName);
      let text = normalizeSbiEntryText(entry?.value);
      if (name && text) {
        const heading = new RegExp(`^${escapeRegExp(name)}[\\.:]?\\s*`, 'i');
        text = text.replace(heading, '');
      }

      const desc = normalizeDescriptionText(text);
      if (!name && !desc) {
        return null;
      }
      return { name, desc };
    })
    .filter((entry) => entry && (entry.name || entry.desc));
}

function normalizeSbiNamedValueMap(entries = []) {
  if (!Array.isArray(entries)) {
    return {
      map: {},
      fallback: []
    };
  }

  const map = {};
  const fallback = [];
  entries.forEach((entry) => {
    const rawName = safeString(entry?.name, '');
    if (!rawName) {
      return;
    }

    const value = safeNumber(entry?.value, NaN);
    if (Number.isFinite(value)) {
      const abilityShort = normalizeSbiAbilityShortName(rawName);
      map[abilityShort || rawName.toLowerCase()] = value;
      return;
    }

    fallback.push(`${toTitleCase(rawName)} ${safeString(entry?.value, '')}`.trim());
  });

  return { map, fallback };
}

function normalizeSbiSpeed(movement = []) {
  if (!Array.isArray(movement)) {
    return {};
  }

  const result = {};

  movement.forEach((entry) => {
    const rawSpeedName = safeString(entry?.name, '').toLowerCase();
    const mappedKey = SBI_SPEED_KEY_MAP[rawSpeedName] || rawSpeedName;
    if (!Object.prototype.hasOwnProperty.call(SPEED_KEYS, mappedKey)) {
      return;
    }

    const parsedValue = safeNumber(entry?.value, NaN);
    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      result[mappedKey] = { value: parsedValue };
    }
  });

  return result;
}

function normalizeSbiLanguages(language = {}) {
  if (!language || typeof language !== 'object') {
    return { as_string: '', data: [] };
  }

  const knownLanguages = Array.isArray(language.knownLanguages) ? language.knownLanguages : [];
  const unknownLanguages = Array.isArray(language.unknownLanguages) ? language.unknownLanguages : [];
  const telepathy = safeString(language.telepathy, '');
  const known = [...knownLanguages, ...unknownLanguages];
  const languageValues = [...known];

  if (telepathy) {
    languageValues.push(`telepathy ${telepathy} ft.`);
  }

  const filtered = languageValues.map((value) => safeString(value, '')).filter(Boolean);
  return {
    as_string: filtered.join(', '),
    data: filtered.map((language) => ({ name: language }))
  };
}

function normalizeSbiResistancesAndImmunities(damagesAndConditions = {}) {
  const bypasses = {
    mgc: 'nonmagical attacks',
    ada: 'adamantine weapons',
    sil: 'silvered weapons'
  };

  const toDisplay = (value = {}) => {
    const types = Array.isArray(value.types) ? value.types.map((entry) => safeString(entry, '').toLowerCase()).filter(Boolean) : [];
    const special = safeString(value.special, '');
    const bypass = Array.isArray(value.bypasses)
      ? value.bypasses.map((b) => bypasses[b]).filter(Boolean)
      : [];

    const chunks = [];
    if (types.length) {
      chunks.push(types.join(', '));
    }
    if (bypass.length) {
      chunks.push(`from ${bypass.join(' or ')}`);
    }
    if (special) {
      chunks.push(special);
    }

    return chunks.join(' ');
  };

  const toOpen5eList = (values = []) => {
    if (!Array.isArray(values)) {
      return [];
    }

    return values
      .map((entry) => ({ name: safeString(entry, '') }))
      .filter((entry) => entry.name);
  };

  const resistancesAndImmunities = {
    damage_immunities: toOpen5eList(damagesAndConditions?.damageImmunities?.types || []),
    damage_resistances: toOpen5eList(damagesAndConditions?.damageResistances?.types || []),
    damage_vulnerabilities: toOpen5eList(damagesAndConditions?.damageVulnerabilities?.types || []),
    condition_immunities: toOpen5eList(damagesAndConditions?.conditionImmunities?.types || []),
  };

  const immunitiesDisplay = toDisplay(damagesAndConditions?.damageImmunities || {});
  const resistancesDisplay = toDisplay(damagesAndConditions?.damageResistances || {});
  const vulnerabilitiesDisplay = toDisplay(damagesAndConditions?.damageVulnerabilities || {});
  const conditionDisplay = toDisplay(damagesAndConditions?.conditionImmunities || {});

  if (immunitiesDisplay) {
    resistancesAndImmunities.damage_immunities_display = immunitiesDisplay;
  }
  if (resistancesDisplay) {
    resistancesAndImmunities.damage_resistances_display = resistancesDisplay;
  }
  if (vulnerabilitiesDisplay) {
    resistancesAndImmunities.damage_vulnerabilities_display = vulnerabilitiesDisplay;
  }
  if (conditionDisplay) {
    resistancesAndImmunities.condition_immunities_display = conditionDisplay;
  }

  return resistancesAndImmunities;
}

function normalizeSbiActor(monster = {}) {
  const abilityScores = normalizeSbiAbilityScores(monster?.abilities || []);
  const features = normalizeSbiNameValueList(monster?.features || []);
  const savingThrows = normalizeSbiNamedValueMap(monster?.savingThrows || []);
  const skills = normalizeSbiNamedValueMap(monster?.skills || []);
  const resistancesAndImmunities = normalizeSbiResistancesAndImmunities(monster?.damagesAndConditions || {});
  const languages = normalizeSbiLanguages(monster?.language);
  const speed = normalizeSbiSpeed(monster?.speeds || []);
  const challenge = safeNumber(monster?.challenge?.cr, 0);

  const traits = [...features];
  if (monster?.language && languages.as_string) {
    traits.push({ name: 'Languages', desc: languages.as_string });
  }
  if (savingThrows.fallback.length) {
    traits.push({ name: 'Saving Throws', desc: savingThrows.fallback.join(', ') });
  }
  if (monster?.senses?.length) {
    const senses = normalizeSbiNameValueList(monster.senses);
    const combined = senses
      .map((sense) => (sense.desc ? `${sense.name} ${sense.desc}` : sense.name))
      .filter(Boolean)
      .join(', ');
    if (combined) {
      traits.push({ name: 'Senses', desc: combined });
    }
  }

  const speedDescription = [];
  if (Number.isFinite(speed?.walk?.value)) {
    speedDescription.push(`walk ${speed.walk.value} ft.`);
  }
  if (Number.isFinite(speed?.fly?.value)) {
    speedDescription.push(`fly ${speed.fly.value} ft.`);
  }
  if (Number.isFinite(speed?.swim?.value)) {
    speedDescription.push(`swim ${speed.swim.value} ft.`);
  }
  if (Number.isFinite(speed?.climb?.value)) {
    speedDescription.push(`climb ${speed.climb.value} ft.`);
  }
  if (Number.isFinite(speed?.burrow?.value)) {
    speedDescription.push(`burrow ${speed.burrow.value} ft.`);
  }
  if (!traits.some((item) => safeString(item?.name, '').toLowerCase() === 'speed') && speedDescription.length) {
    traits.push({ name: 'Speed', desc: speedDescription.join(', ') });
  }

  const normalizedType = safeString(monster.type, safeString(monster.customType, 'humanoid'));

  return {
    name: safeString(monster.name, 'Unknown Monster'),
    key: safeString(monster.name, ''),
    slug: safeString(monster.name, ''),
    alignment: safeString(monster.alignment, 'unaligned'),
    size: safeString(monster.size, 'Medium'),
    type: normalizedType,
    armor_class: safeNumber(monster.armor?.ac, 10),
    hit_points: safeNumber(monster.health?.value, 0),
    hit_dice: safeString(monster.health?.formula, ''),
    challenge_rating_decimal: challenge,
    challenge_rating_text: String(challenge),
    speed_all: speed,
    ability_scores: {
      strength: safeNumber(abilityScores.strength, 10),
      dexterity: safeNumber(abilityScores.dexterity, 10),
      constitution: safeNumber(abilityScores.constitution, 10),
      intelligence: safeNumber(abilityScores.intelligence, 10),
      wisdom: safeNumber(abilityScores.wisdom, 10),
      charisma: safeNumber(abilityScores.charisma, 10)
    },
    saving_throws_all: savingThrows.map,
    skill_bonuses_all: skills.map,
    desc: '',
    traits,
    actions: normalizeSbiNameValueList(monster?.actions || []),
    bonusActions: normalizeSbiNameValueList(monster?.bonusActions || []),
    reactions: normalizeSbiNameValueList(monster?.reactions || []),
    legendaryActions: normalizeSbiNameValueList(monster?.legendaryActions || []),
    mythicActions: [
      ...normalizeSbiNameValueList(monster?.mythicActions || []),
      ...normalizeSbiNameValueList(monster?.villainActions || [])
    ],
    lairActions: normalizeSbiNameValueList(monster?.lairActions || []),
    regional_effects: [],
    proficiency_bonus: safeNumber(monster.challenge?.pb, NaN),
    experience_points: safeNumber(monster.challenge?.xp, 0),
    resistances_and_immunities: resistancesAndImmunities,
    languages,
    acDesc: Array.isArray(monster.armor?.types) ? monster.armor.types.join(', ') : '',
    source: { display_name: 'Manual 5E Statblock Importer', name: 'Manual 5E Statblock Importer', key: 'manual-statblock-importer', type: 'SOURCE' },
    document: { display_name: 'Manual 5E Statblock Importer', name: 'Manual 5E Statblock Importer', key: 'manual-statblock-importer', type: 'SOURCE' },
    sourceUrl: '',
    url: '',
    rawSource: monster
  };
}

function is5eStatblockImporterActor(monster = {}) {
  return (
    monster
    && typeof monster === 'object'
    && Array.isArray(monster.abilities)
    && Object.prototype.hasOwnProperty.call(monster, 'challenge')
    && Object.prototype.hasOwnProperty.call(monster, 'speeds')
  );
}

function normalizeOpen5eMonster(input = {}) {
  if (is5eStatblockImporterActor(input)) {
    return normalizeSbiActor(input);
  }

  const source = input && typeof input === 'object' ? input : {};
  const abilityScores = toAbilityScores(source.ability_scores || {});
  const size = source.size?.name || safeString(source.size, '');
  const type = source.type?.name || safeString(source.type, '');
  const challengeValue = safeNumber(
    source.challenge_rating_decimal ?? source.challenge_rating ?? source.challenge_rating_text,
    0
  );
  const speed = toMovement(source);
  const groupedActions = mergeOpen5eActionsByType(source.actions || []);
  const traits = [
    ...normalizeFeatureList(source.traits, 'Trait')
  ];
  const savingThrows = normalizeOpen5eKeyValueList(source.saving_throws_all || source.saving_throws || {});
  if (savingThrows.length) {
    traits.push({
      name: 'Saving Throws',
      desc: savingThrows.join(', ')
    });
  }

  const skills = normalizeOpen5eKeyValueList(source.skill_bonuses_all || source.skill_bonuses || {});
  if (skills.length) {
    traits.push({
      name: 'Skills',
      desc: skills.join(', ')
    });
  }

  for (const sense of normalizeOpen5eSenses(source)) {
    traits.push({
      name: 'Senses',
      desc: sense
    });
  }

  for (const resistance of normalizeOpen5eResistancesAndImmunities(source.resistances_and_immunities || {})) {
    const [name, ...parts] = String(resistance).split(':');
    if (!name || !parts.length) {
      traits.push({
        name: 'Resistances',
        desc: resistance
      });
    } else {
      traits.push({
        name: normalizeText(name),
        desc: normalizeText(parts.join(':'))
      });
    }
  }

  const languagesText = normalizeOpen5eLanguages(source.languages) || safeString(source.language, '');
  if (languagesText) {
    traits.unshift({
      name: 'Languages',
      desc: languagesText
    });
  }

  return {
    name: safeString(source.name, 'Unknown Monster'),
    key: safeString(source.key, safeString(source.slug, '')),
    slug: safeString(source.slug, safeString(source.key, '')),
    sourceUrl: safeString(source.url, ''),
    alignment: safeString(source.alignment, 'unaligned'),
    size,
    type,
    ac: safeNumber(source.armor_class, 10),
    hp: safeNumber(source.hit_points, 0),
    challenge: challengeValue,
    challengeText: safeString(source.challenge_rating_text, String(challengeValue || '')),
    hpDice: safeString(source.hit_dice, ''),
    proficiencyBonus: safeNumber(source.proficiency_bonus, NaN),
    experiencePoints: safeNumber(source.experience_points, challengeXpForValue(challengeValue)),
    acDesc: safeString(source.armor_detail, ''),
    speed,
    abilityScores,
    desc: normalizeText(source.desc),
    traits,
    actions: groupedActions.action,
    bonusActions: groupedActions.bonus,
    reactions: groupedActions.reaction,
    legendaryActions: groupedActions.legendary,
    mythicActions: groupedActions.mythic,
    lairActions: groupedActions.lair,
    img: safeString(source.illustration, FALLBACK_ICON),
    sourceInfo: source.document || null,
    rawSource: source
  };
}

function toBiography(monster = {}) {
  const data = monster && typeof monster === 'object' ? monster : {};
  const sections = [];

  if (data.desc) {
    sections.push(data.desc);
  }

  if (Array.isArray(data.traits) && data.traits.length) {
    const traitLines = data.traits.map((trait) => `${trait.name}: ${trait.desc || 'No details.'}`);
    sections.push('Traits:');
    sections.push(traitLines.join('\n'));
  }

  if (Array.isArray(data.actions) && data.actions.length) {
    const actionLines = data.actions.map((action) => `${action.name}: ${action.desc || 'No details.'}`);
    sections.push('Actions:');
    sections.push(actionLines.join('\n'));
  }

  return sections.join('\n\n').trim();
}

function toActorSystem(monster = {}) {
  const isNormalized = (
    monster &&
    typeof monster === 'object' &&
    ('abilityScores' in monster || 'challenge' in monster || 'challengeText' in monster || 'rawSource' in monster)
  );

  const data = isNormalized ? monster : normalizeOpen5eMonster(monster);
  const movement = toMovement(data.speed || {});

  return {
    abilities: data.abilityScores,
    attributes: {
      hp: {
        value: safeNumber(data.hp, 10),
        max: safeNumber(data.hp, 10),
        formula: safeString(data.hpDice, safeString(data.rawSource?.hit_dice, ''))
      },
      ac: {
        value: safeNumber(data.ac, 10)
      },
      movement
    },
    details: {
      alignment: { value: data.alignment || 'unaligned' },
      type: { value: data.type || 'humanoid' },
      cr: { value: safeNumber(data.challenge, 0) },
      source: { value: safeString(data.sourceInfo?.display_name || data.sourceInfo?.name, 'Open5E') }
    },
    biography: {
      value: toBiography(data)
    },
    size: safeString(data.size, 'med')
  };
}

function buildMonsterActorPayload(monster = {}) {
  const normalized = normalizeOpen5eMonster(monster);

  return {
    name: normalized.name,
    type: 'npc',
    img: normalized.img || FALLBACK_ICON,
    system: toActorSystem(normalized),
    flags: {
      [MONSTER_CREATOR_ID]: {
        open5e: {
          sourceKey: normalized.key,
          sourceSlug: normalized.slug,
          sourceUrl: normalized.sourceUrl,
          sourceName: normalized.sourceInfo?.name || normalized.sourceInfo?.display_name || '',
          raw: normalized.rawSource
        },
        notes: normalizeText(monster.notes)
      }
    },
    prototypeToken: {
      actorLink: false
    }
  };
}

const api = {
  normalizeOpen5eMonster,
  toAbilityScores,
  toMovement,
  toActorSystem,
  toBiography,
  toWotcStatblockText,
  buildMonsterActorPayload
};

globalThis.MonsterCreatorStatblockFormatter = api;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
