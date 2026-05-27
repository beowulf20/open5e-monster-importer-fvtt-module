import { createBm25Index, searchBm25Index } from './bm25-search.mjs';
import { OPEN5E_CREATURES, OPEN5E_DATA_META } from './creatures.generated.mjs';

const EMBEDDED_PAGE_ROOT = 'embedded://open5e/v2/creatures/';

const safeString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(safeString).filter(Boolean).join(' ');
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'name')) return safeString(value.name);
    if (Object.prototype.hasOwnProperty.call(value, 'key')) return safeString(value.key);
    if (Object.prototype.hasOwnProperty.call(value, 'value')) return safeString(value.value);
    if (Object.prototype.hasOwnProperty.call(value, 'as_string')) return safeString(value.as_string);
    return Object.values(value).map(safeString).filter(Boolean).join(' ');
  }
  return '';
};

const normalizeKey = (value) => {
  return safeString(value).toLowerCase().replace(/[_\s]+/g, '-');
};

const normalizeChallengeKey = (value) => {
  return safeString(value).toLowerCase().replace(/\.0+$/, '').replace(/\s+/g, '');
};

const includesLoose = (left, right) => {
  const haystack = normalizeKey(left);
  const needle = normalizeKey(right);
  return !needle || haystack === needle || haystack.includes(needle);
};

const firstText = (...values) => {
  for (const value of values) {
    const text = safeString(value);
    if (text) return text;
  }
  return '';
};

const listText = (value) => {
  if (!value) return '';
  if (Array.isArray(value)) {
    return value.map((entry) => {
      if (typeof entry === 'string') return entry;
      return [
        safeString(entry?.name),
        safeString(entry?.title),
        safeString(entry?.desc),
        safeString(entry?.description),
        safeString(entry?.text)
      ].filter(Boolean).join(' ');
    }).filter(Boolean).join(' ');
  }
  return safeString(value);
};

const getSourceKey = (monster) => firstText(
  monster?.document?.key,
  monster?.document__key,
  monster?.source?.key,
  monster?.source
);

const getSourceName = (monster) => firstText(
  monster?.document?.display_name,
  monster?.document?.name,
  monster?.source?.name
);

const getType = (monster) => firstText(monster?.type?.key, monster?.type?.name, monster?.type);
const getSize = (monster) => firstText(monster?.size?.key, monster?.size?.name, monster?.size);

const getCreatureKey = (monster) => firstText(
  monster?.key,
  monster?.slug,
  monster?.index,
  safeString(monster?.url).split('/').filter(Boolean).pop()
);

const buildDocument = (monster, index) => {
  const key = getCreatureKey(monster);
  const sourceKey = getSourceKey(monster);
  const sourceName = getSourceName(monster);
  const type = getType(monster);
  const size = getSize(monster);
  const challenge = firstText(
    monster?.challenge_rating_decimal,
    monster?.challenge_rating,
    monster?.challenge_rating_text
  ).replace(/\.0+$/, '');
  const challengeKeys = [
    normalizeChallengeKey(monster?.challenge_rating_decimal),
    normalizeChallengeKey(monster?.challenge_rating),
    normalizeChallengeKey(monster?.challenge_rating_text),
    normalizeChallengeKey(challenge)
  ].filter(Boolean);

  return {
    index,
    monster,
    key: normalizeKey(key),
    sourceKey: normalizeKey(sourceKey),
    typeKey: normalizeKey(type),
    sizeKey: normalizeKey(size),
    challengeKeys,
    fields: {
      name: monster?.name,
      key,
      type,
      size,
      source: [sourceKey, sourceName, safeString(monster?.document?.publisher?.name)].join(' '),
      traits: [
        listText(monster?.traits),
        listText(monster?.special_abilities),
        listText(monster?.reactions),
        listText(monster?.legendary_actions),
        listText(monster?.mythic_actions),
        listText(monster?.lair_actions),
        safeString(monster?.spellcasting)
      ].join(' '),
      actions: [
        listText(monster?.actions),
        listText(monster?.bonus_actions),
        listText(monster?.attacks)
      ].join(' '),
      text: [
        monster?.category,
        monster?.subcategory,
        monster?.alignment,
        challenge ? `cr${challenge}` : '',
        monster?.challenge_rating,
        monster?.challenge_rating_text,
        monster?.challenge_rating_decimal,
        safeString(monster?.languages),
        safeString(monster?.senses),
        safeString(monster?.speed),
        safeString(monster?.speed_all),
        safeString(monster?.damage_immunities),
        safeString(monster?.damage_resistances),
        safeString(monster?.damage_vulnerabilities),
        safeString(monster?.condition_immunities),
        safeString(monster?.skills),
        safeString(monster?.saving_throws),
        monster?.desc,
        monster?.description
      ].filter(Boolean).join(' ')
    }
  };
};

let cachedDocuments = null;
let cachedIndex = null;

const getDocuments = () => {
  if (!cachedDocuments) {
    cachedDocuments = OPEN5E_CREATURES.map(buildDocument);
  }
  return cachedDocuments;
};

const getIndex = () => {
  if (!cachedIndex) {
    cachedIndex = createBm25Index(getDocuments());
  }
  return cachedIndex;
};

const filterRecords = ({ type = '', size = '', source = '' } = {}) => {
  const records = getIndex().records;
  return records.filter(({ document }) => {
    if (type && !includesLoose(document.typeKey, type) && !includesLoose(document.fields.type, type)) return false;
    if (size && !includesLoose(document.sizeKey, size) && !includesLoose(document.fields.size, size)) return false;
    if (source && !includesLoose(document.sourceKey, source) && !includesLoose(document.fields.source, source)) return false;
    return true;
  });
};

const makePageUrl = (page, limit) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `${EMBEDDED_PAGE_ROOT}?${params.toString()}`;
};

const getChallengeFilter = (query) => {
  const match = safeString(query).toLowerCase().match(/\b(?:cr|challenge)\s*([0-9]+(?:\.[0-9]+)?|[0-9]+\s*\/\s*[0-9]+)\b/);
  return match ? normalizeChallengeKey(match[1]) : '';
};

export const searchEmbeddedOpen5e = ({
  query = '',
  page = 1,
  limit = 100,
  type = '',
  size = '',
  source = ''
} = {}) => {
  const safePage = Math.max(1, Math.floor(Number(page) || 1));
  const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 100)));
  const filteredRecords = filterRecords({ type, size, source });
  const queryText = safeString(query);
  const challengeFilter = getChallengeFilter(queryText);
  const searchRecords = challengeFilter
    ? filteredRecords.filter(({ document }) => document.challengeKeys.includes(challengeFilter))
    : filteredRecords;

  const scored = queryText
    ? searchBm25Index(getIndex(), queryText, searchRecords)
    : searchRecords.map((record) => ({ record, score: 0 }));

  const start = (safePage - 1) * safeLimit;
  const results = scored.slice(start, start + safeLimit).map(({ record }) => record.document.monster);
  const count = scored.length;
  const hasNext = start + safeLimit < count;
  const hasPrevious = safePage > 1 && count > 0;

  return {
    count,
    next: hasNext ? makePageUrl(safePage + 1, safeLimit) : null,
    previous: hasPrevious ? makePageUrl(safePage - 1, safeLimit) : null,
    page: safePage,
    results,
    meta: {
      source: 'embedded',
      generatedAt: OPEN5E_DATA_META.generatedAt,
      totalEmbedded: OPEN5E_CREATURES.length
    }
  };
};

export const findEmbeddedOpen5eCreature = (value) => {
  const lookup = normalizeKey(value);
  if (!lookup) return null;

  const documents = getDocuments();
  return documents.find((document) => {
    const urlSlug = normalizeKey(safeString(document.monster?.url).split('/').filter(Boolean).pop());
    return document.key === lookup || urlSlug === lookup;
  })?.monster || null;
};

export const getEmbeddedOpen5eMeta = () => ({
  ...OPEN5E_DATA_META,
  count: OPEN5E_CREATURES.length
});
