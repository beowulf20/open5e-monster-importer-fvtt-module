const MODULE_ID = 'monster-creator';

const FILTERABLE_SOURCE_CATEGORIES = new Set([
  'official',
  'ua',
  'third-party',
  'homebrew'
]);

function getFc5Metadata(item) {
  return item?.getFlag?.(MODULE_ID, 'fc5') ?? item?.flags?.[MODULE_ID]?.fc5 ?? null;
}

function isFc5Class(item) {
  const fc5 = getFc5Metadata(item);
  return item?.type === 'class' && fc5?.type === 'class';
}

function buildFc5SubclassBrowserFilters(classItem) {
  const identifier = classItem?.identifier || classItem?.system?.identifier || '';
  const fc5 = getFc5Metadata(classItem) || {};
  const sourceCategory = String(fc5.sourceCategory || '').trim().toLowerCase();
  const rules = String(classItem?.system?.source?.rules || fc5.rules || '').trim();
  const locked = {
    additional: { class: { [identifier]: 1 } },
    types: new Set(['subclass'])
  };

  const arbitrary = [];
  if (FILTERABLE_SOURCE_CATEGORIES.has(sourceCategory)) {
    arbitrary.push({
      k: `flags.${MODULE_ID}.fc5.sourceCategory`,
      v: sourceCategory
    });
  }

  if (rules) {
    arbitrary.push({
      k: 'system.source.rules',
      v: rules
    });
  }

  if (arbitrary.length) {
    locked.arbitrary = arbitrary;
  }

  return { locked };
}

function installFc5SubclassBrowserFilter() {
  const flowClass = globalThis.dnd5e?.applications?.advancement?.SubclassFlow;
  const compendiumBrowser = globalThis.dnd5e?.applications?.CompendiumBrowser;
  if (!flowClass || !compendiumBrowser) {
    return;
  }

  const originalBrowse = flowClass.prototype._onBrowseCompendium;
  if (typeof originalBrowse !== 'function' || originalBrowse._monsterCreatorWrapped) {
    return;
  }

  const wrappedBrowse = async function wrappedFc5SubclassBrowse(event) {
    const classItem = this?.item;
    if (!isFc5Class(classItem)) {
      return originalBrowse.call(this, event);
    }

    const identifier = classItem?.identifier || classItem?.system?.identifier || '';
    if (!identifier) {
      return originalBrowse.call(this, event);
    }

    event?.preventDefault?.();
    const result = await compendiumBrowser.selectOne({
      filters: buildFc5SubclassBrowserFilters(classItem)
    });
    if (result) {
      this.subclass = await fromUuid(result);
    }
    this.render();
  };

  wrappedBrowse._monsterCreatorWrapped = true;
  flowClass.prototype._onBrowseCompendium = wrappedBrowse;
}

Hooks.once('ready', () => {
  try {
    installFc5SubclassBrowserFilter();
  } catch (error) {
    console.error(`[${MODULE_ID}] Failed to install FC5 subclass browser filter.`, error);
  }
});
