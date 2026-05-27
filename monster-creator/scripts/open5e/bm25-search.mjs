const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'it',
  'its',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with'
]);

const SEMANTIC_EXPANSIONS = {
  airborne: ['fly', 'flying', 'hover', 'wing', 'wings'],
  aquatic: ['swim', 'water', 'amphibious', 'sea', 'ocean'],
  archer: ['bow', 'longbow', 'shortbow', 'ranged'],
  beast: ['animal', 'creature', 'monstrosity'],
  caster: ['spell', 'spellcasting', 'innate', 'magic', 'mage'],
  cold: ['ice', 'frost', 'freezing'],
  demon: ['fiend', 'abyssal'],
  devil: ['fiend', 'infernal'],
  dragon: ['drake', 'wyrm', 'wyrmling'],
  fire: ['flame', 'burn', 'burning', 'heat'],
  flying: ['fly', 'hover', 'wing', 'wings', 'airborne'],
  healer: ['heal', 'healing', 'restore'],
  invisible: ['stealth', 'hidden', 'unseen'],
  magic: ['spell', 'spellcasting', 'innate', 'caster'],
  melee: ['claw', 'bite', 'slam', 'sword', 'axe'],
  poison: ['venom', 'toxin', 'toxic'],
  ranged: ['bow', 'crossbow', 'javelin', 'sling'],
  stealthy: ['stealth', 'sneak', 'hidden', 'invisible'],
  tank: ['armor', 'armored', 'resistance', 'resistant', 'high', 'hp'],
  undead: ['zombie', 'skeleton', 'ghost', 'wraith', 'vampire', 'lich']
};

const FIELD_WEIGHTS = {
  name: 8,
  key: 5,
  type: 4,
  size: 3,
  source: 3,
  traits: 2,
  actions: 2,
  text: 1
};

const safeString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(safeString).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    return Object.values(value).map(safeString).filter(Boolean).join(' ');
  }
  return '';
};

export const tokenize = (value) => {
  return safeString(value)
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/g)
    .filter((token) => token && token.length > 1 && !STOP_WORDS.has(token));
};

const addWeightedTokens = (termWeights, tokens, weight) => {
  for (const token of tokens) {
    termWeights.set(token, (termWeights.get(token) || 0) + weight);
  }
};

export const buildQueryTerms = (query) => {
  const terms = new Map();
  const originalTokens = tokenize(query);
  const queryText = safeString(query).toLowerCase();
  const challengeMatch = queryText.match(/\b(?:cr|challenge)\s*([0-9]+(?:\.[0-9]+)?|[0-9]+\s*\/\s*[0-9]+)\b/);

  for (const token of originalTokens) {
    terms.set(token, (terms.get(token) || 0) + 1);
    for (const expanded of SEMANTIC_EXPANSIONS[token] || []) {
      for (const expandedToken of tokenize(expanded)) {
        terms.set(expandedToken, (terms.get(expandedToken) || 0) + 0.45);
      }
    }
  }

  if (challengeMatch) {
    terms.set(`cr${challengeMatch[1].replace(/\s+/g, '')}`, (terms.get(`cr${challengeMatch[1].replace(/\s+/g, '')}`) || 0) + 2);
  }

  return terms;
};

export const createBm25Index = (documents) => {
  const records = documents.map((document, index) => {
    const termWeights = new Map();
    let length = 0;

    for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
      const tokens = tokenize(document.fields?.[field]);
      addWeightedTokens(termWeights, tokens, weight);
      length += tokens.length * weight;
    }

    return {
      index,
      document,
      termWeights,
      length: Math.max(1, length)
    };
  });

  const docFrequency = new Map();
  for (const record of records) {
    for (const token of record.termWeights.keys()) {
      docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
    }
  }

  const averageLength = records.length
    ? records.reduce((sum, record) => sum + record.length, 0) / records.length
    : 1;

  return {
    records,
    docFrequency,
    averageLength,
    documentCount: records.length
  };
};

export const scoreBm25Record = (index, record, queryTerms) => {
  const k1 = 1.2;
  const b = 0.75;
  let score = 0;

  for (const [token, queryWeight] of queryTerms.entries()) {
    const termFrequency = record.termWeights.get(token) || 0;
    if (!termFrequency) continue;

    const frequency = index.docFrequency.get(token) || 0;
    const idf = Math.log(1 + ((index.documentCount - frequency + 0.5) / (frequency + 0.5)));
    const normalized = termFrequency + k1 * (1 - b + b * (record.length / index.averageLength));
    score += queryWeight * idf * ((termFrequency * (k1 + 1)) / normalized);
  }

  return score;
};

export const searchBm25Index = (index, query, records = index.records) => {
  const queryTerms = buildQueryTerms(query);
  if (!queryTerms.size) {
    return records.map((record) => ({ record, score: 0 }));
  }

  const queryText = safeString(query).trim().toLowerCase();
  const scored = [];

  for (const record of records) {
    let score = scoreBm25Record(index, record, queryTerms);
    const name = safeString(record.document.fields?.name).toLowerCase();
    const key = safeString(record.document.fields?.key).toLowerCase();

    if (name === queryText || key === queryText) score += 20;
    else if (name.includes(queryText)) score += 8;
    else if (key.includes(queryText)) score += 5;

    if (score > 0) {
      scored.push({ record, score });
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.record.index - b.record.index;
  });

  return scored;
};
