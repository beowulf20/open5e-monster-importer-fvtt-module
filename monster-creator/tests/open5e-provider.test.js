const path = require('path');

const providerPath = path.join(__dirname, '../scripts/open5e/open5e-provider.mjs');

describe('embedded Open5E provider', () => {
  let provider;

  beforeAll(async () => {
    provider = await import(providerPath);
  });

  test('finds embedded creatures by source key', () => {
    const aboleth = provider.findEmbeddedOpen5eCreature('a5e-mm_aboleth');

    expect(aboleth).toBeTruthy();
    expect(aboleth.name).toBe('Aboleth');
  });

  test('runs local BM25 search and returns Open5E-compatible pagination', () => {
    const payload = provider.searchEmbeddedOpen5e({ query: 'zombie', limit: 10 });

    expect(payload.count).toBeGreaterThan(0);
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results.length).toBeLessThanOrEqual(10);
    expect(payload.results.some((monster) => /zombie/i.test(monster.name))).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(payload, 'next')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(payload, 'previous')).toBe(true);
  });

  test('applies source filters before ranking', () => {
    const payload = provider.searchEmbeddedOpen5e({
      query: 'aboleth',
      source: 'a5e-mm',
      limit: 5
    });

    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results[0].document.key).toBe('a5e-mm');
  });
});
