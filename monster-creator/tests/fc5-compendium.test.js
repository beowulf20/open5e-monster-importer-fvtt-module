const fs = require('fs');
const path = require('path');

const fixturePath = path.join(__dirname, 'fixtures', 'fc5-compendium.fixture.xml');
const fixtureXml = fs.readFileSync(fixturePath, 'utf8');

const {
  buildPackFolderDocuments,
  convertClass,
  convertItem,
  convertSpell,
  dedupeDocuments,
  deterministicId,
  generateCompendiumDocuments,
  isFeatureLikeSpell,
  parseFc5Xml,
  splitSourceText
} = require('../../tools/fc5-compendium');

function buildTestFeature(name, text, overrides = {}) {
  return {
    name,
    text,
    optional: false,
    subclass: '',
    modifiers: [],
    rolls: [],
    ...overrides
  };
}

function buildTestClass(overrides = {}) {
  return {
    name: 'Test Class',
    hd: '8',
    proficiency: 'Strength, Wisdom',
    numSkills: 0,
    armor: 'None',
    weapons: 'Simple Weapons',
    tools: 'None',
    wealth: '0',
    spellAbility: '',
    slotsReset: '',
    traits: [{
      name: overrides.name || 'Test Class',
      text: 'Synthetic class rules.\n\nSource:\tSynthetic Manual p. 1'
    }],
    autolevels: [],
    ...overrides
  };
}

function buildTestItem(name, sourceLine) {
  return {
    name,
    detail: 'rare (requires attunement)',
    typeCode: 'M',
    magic: true,
    weight: '3',
    value: '',
    ac: '',
    property: 'T',
    dmg1: '1d8',
    dmg2: '',
    dmgType: 'P',
    range: '10/30',
    text: `A source-normalized weapon.\n\nSource:\t${sourceLine}`,
    modifiers: [],
    rolls: []
  };
}

function findToolAdvancement(classDocument) {
  return classDocument.system.advancement.find((entry) => {
    if (entry.type !== 'Trait') return false;
    const grants = entry.configuration?.grants || [];
    const choices = entry.configuration?.choices || [];
    return grants.some((grant) => grant.startsWith('tool:'))
      || choices.some((choice) => (choice.pool || []).some((grant) => grant.startsWith('tool:')));
  });
}

function findWeaponAdvancement(classDocument) {
  return classDocument.system.advancement.find((entry) => {
    if (entry.type !== 'Trait') return false;
    const grants = entry.configuration?.grants || [];
    return grants.some((grant) => grant.startsWith('weapon:'));
  });
}

function scaleAdvancementsByIdentifier(classDocument) {
  return Object.fromEntries(classDocument.system.advancement
    .filter((entry) => entry.type === 'ScaleValue')
    .map((entry) => [entry.configuration.identifier, entry]));
}

describe('FC5 compendium conversion', () => {
  test('parses the synthetic FC5 fixture into top-level records', () => {
    const parsed = parseFc5Xml(fixtureXml);

    expect(parsed.classes).toHaveLength(1);
    expect(parsed.spells).toHaveLength(2);
    expect(parsed.items).toHaveLength(5);
    expect(parsed.classes[0].autolevels).toHaveLength(4);
  });

  test('maps spells to dnd5e spell documents with real range, duration, save, and scaling data', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const spell = convertSpell(parsed.spells[0]);
    const activity = spell.system.activities.dnd5eactivity000;

    expect(spell.type).toBe('spell');
    expect(spell.system.level).toBe(2);
    expect(spell.system.school).toBe('evo');
    expect(spell.system.source.book).toBe('Homebrew Manual (2024)');
    expect(spell.system.source.page).toBe('33');
    expect(spell.system.source.rules).toBe('2024');
    expect(spell.system.properties).toEqual(expect.arrayContaining(['vocal', 'somatic', 'material']));
    expect(spell.system.materials.value).toBe('a copper wire');
    expect(spell.system.range.units).toBe('self');
    expect(spell.system.target.template.type).toBe('cone');
    expect(spell.system.target.template.size).toBe('30');
    expect(spell.system.duration.units).toBe('minute');
    expect(activity.type).toBe('save');
    expect(activity.save.ability).toBe('con');
    expect(activity.damage.onSave).toBe('half');
    expect(activity.damage.parts[0].number).toBe(3);
    expect(activity.damage.parts[0].denomination).toBe(6);
    expect(activity.damage.parts[0].types).toEqual(['thunder']);
    expect(activity.damage.parts[0].scaling.mode).toBe('whole');
    expect(activity.damage.parts[0].scaling.number).toBe(1);
  });

  test('routes FC5 spell-shaped class options into feature documents', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const documents = generateCompendiumDocuments(parsed);
    const feature = documents.features.find((entry) => entry.name === 'Arcane Fighting Style: Blaster (HB)');

    expect(isFeatureLikeSpell(parsed.spells[1])).toBe(true);
    expect(documents.spells.map((entry) => entry.name)).not.toContain('Arcane Fighting Style: Blaster (HB)');
    expect(feature).toBeDefined();
    expect(feature._id).toBe(deterministicId([
      'spell',
      'Arcane Fighting Style: Blaster (HB)',
      "Valda's Spire of Secrets",
      '159',
      0,
      'Warmage (Valda): Arcane Fighting Styles',
      '',
      '',
      '',
      '',
      'You gain a +1 bonus to the saving throw DCs of your warmage spells.',
      '[]'
    ].join('|')));
    expect(feature.type).toBe('feat');
    expect(feature.system.type.value).toBe('class');
    expect(feature.system.requirements).toBe('Warmage (Valda): Arcane Fighting Styles');
    expect(feature.flags['monster-creator'].fc5.type).toBe('feature');
    expect(feature.flags['monster-creator'].fc5.sourceCategory).toBe('homebrew');
  });

  test('maps rider-style save spells into non-transfer spell effects linked from the activity', () => {
    const spell = convertSpell({
      name: 'Befuddlement [2024]',
      level: 8,
      school: 'EN',
      ritual: false,
      time: 'Action',
      range: '150 feet',
      components: 'V, S, M (a key ring with no keys)',
      duration: 'Instantaneous',
      classes: 'Wizard [2024]',
      text: `You blast the mind of a creature that you can see within range. The target makes an Intelligence saving throw.
On a failed save, the target takes 10d12 Psychic damage and can't cast spells or take the Magic action. At the end of every 30 days, the target repeats the save, ending the effect on a success.
On a successful save, the target takes half as much damage only.

Source:\tPlayer's Handbook (2024) p. 245`,
      modifiers: [],
      rolls: [{ description: 'Psychic Damage', level: null, formula: '10d12' }]
    });
    const activity = spell.system.activities.dnd5eactivity000;

    expect(spell.effects).toHaveLength(1);
    expect(spell.effects[0].name).toBe('Befuddled');
    expect(spell.effects[0].transfer).toBe(false);
    expect(spell.effects[0].description).toContain("can't cast spells");
    expect(activity.effects).toEqual([
      expect.objectContaining({
        _id: spell.effects[0]._id,
        onSave: false
      })
    ]);
  });

  test('maps condition spells into status effects linked from the save activity', () => {
    const spell = convertSpell({
      name: 'Blindness/Deafness [2024]',
      level: 2,
      school: 'T',
      ritual: false,
      time: 'Action',
      range: '120 feet',
      components: 'V',
      duration: '1 minute',
      classes: 'Wizard [2024]',
      text: `One creature that you can see within range must succeed on a Constitution saving throw, or it has the blinded or deafened condition (your choice) for the duration. At the end of each of its turns, the target repeats the save, ending the spell on itself on a success.

Source:\tPlayer's Handbook (2024) p. 249`,
      modifiers: [],
      rolls: []
    });
    const activity = spell.system.activities.dnd5eactivity000;

    expect(spell.effects).toHaveLength(2);
    expect(spell.effects.map((effect) => effect.statuses[0]).sort()).toEqual(['blinded', 'deafened']);
    expect(spell.effects.every((effect) => effect.transfer === false)).toBe(true);
    expect(activity.effects).toHaveLength(2);
    expect(activity.effects.every((effect) => effect.onSave === false)).toBe(true);
  });

  test('maps ranged weapons with range and ammunition into dnd5e weapon documents', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const weapon = convertItem(parsed.items[0]);

    expect(weapon.type).toBe('weapon');
    expect(weapon.system.type.value).toBe('martialR');
    expect(weapon.system.range.value).toBe(150);
    expect(weapon.system.range.long).toBe(600);
    expect(weapon.system.properties).toEqual(expect.arrayContaining(['amm', 'hvy', 'two', 'mgc']));
    expect(weapon.system.damage.base.number).toBe(1);
    expect(weapon.system.damage.base.denomination).toBe(8);
    expect(weapon.system.damage.base.types).toEqual(['piercing']);
    expect(weapon.system.activities.dnd5eactivity000.attack.type.value).toBe('ranged');
    expect(weapon.system.ammunition.type).toBe('arrow');
  });

  test('maps armor and consumables into the correct dnd5e item families', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const armor = convertItem(parsed.items[1]);
    const potion = convertItem(parsed.items[2]);

    expect(armor.type).toBe('equipment');
    expect(armor.system.type.value).toBe('medium');
    expect(armor.system.attunement).toBe('required');
    expect(armor.system.armor.value).toBe(14);
    expect(armor.system.armor.magicalBonus).toBe(1);

    expect(potion.type).toBe('consumable');
    expect(potion.system.type.value).toBe('potion');
    expect(potion.system.uses.max).toBe('1');
    expect(potion.system.activities.dnd5eactivity000.type).toBe('heal');
    expect(potion.system.activities.dnd5eactivity000.healing.number).toBe(2);
    expect(potion.system.activities.dnd5eactivity000.healing.denomination).toBe(4);
  });

  test('maps safe FC5 modifiers into Active Effects and preserves unsupported modifiers in flags', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const weapon = convertItem(parsed.items[0]);
    const armor = convertItem(parsed.items[1]);
    const agilityShard = convertItem(parsed.items[3]);
    const badge = convertItem(parsed.items[4]);

    expect(weapon.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.bonuses.rwak.attack',
        mode: 2,
        value: '+1'
      })
    ]);
    expect(armor.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.attributes.ac.bonus',
        mode: 2,
        value: '+1'
      })
    ]);
    expect(agilityShard.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.abilities.dex.value',
        mode: 2,
        value: '+2'
      })
    ]);
    expect(badge.effects).toHaveLength(0);
    expect(badge.flags['monster-creator'].fc5.unmappedModifiers).toEqual([
      expect.objectContaining({
        category: 'bonus',
        value: 'bonus hp +1',
        reason: 'unsupported-subject'
      })
    ]);
  });

  test('builds classes, subclasses, and feature UUID dependencies that match dnd5e advancement flow', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const result = convertClass(parsed.classes[0]);
    const classDoc = result.classDocument;
    const subclass = result.subclassDocuments[0];
    const mirrorVeil = result.featureDocuments.find((entry) => entry.name === 'Mirror Veil (Path of Echoes)');

    expect(classDoc.type).toBe('class');
    expect(classDoc.system.identifier).toBe('stormblade');
    expect(classDoc.system.spellcasting.progression).toBe('full');
    expect(classDoc.system.spellcasting.ability).toBe('cha');
    expect(classDoc.system.spellcasting.preparation.formula).toBe('@abilities.cha.mod + @classes.stormblade.levels');
    expect(classDoc.system.advancement.some((entry) => entry.type === 'Subclass' && entry.level === 3)).toBe(true);
    expect(classDoc.system.advancement.some((entry) => entry.type === 'AbilityScoreImprovement' && entry.level === 4)).toBe(true);

    expect(subclass.type).toBe('subclass');
    expect(subclass.system.classIdentifier).toBe('stormblade');
    expect(subclass.system.advancement).toHaveLength(2);
    expect(subclass.system.advancement[0].configuration.items[0].uuid).toContain('Compendium.monster-creator.fc5features.Item.');

    expect(mirrorVeil.system.uses.max).toBe('1');
    expect(mirrorVeil.system.uses.recovery).toEqual([{ period: 'sr', type: 'recoverAll' }]);
    expect(mirrorVeil.system.activities.dnd5eactivity000.activation.type).toBe('bonus');
    expect(mirrorVeil.effects).toHaveLength(1);
    expect(mirrorVeil.effects[0].disabled).toBe(true);
    expect(mirrorVeil.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.attributes.ac.bonus',
        mode: 2,
        value: '+2'
      })
    ]);
  });

  test('maps fixed and selectable tool proficiencies into valid dnd5e trait advancements', () => {
    const artificer = convertClass(buildTestClass({
      name: 'Artificer',
      tools: "Thieves' Tools, Tinker's Tools, one type of Artisan's Tools of your choice"
    })).classDocument;
    const bard = convertClass(buildTestClass({
      name: 'Bard',
      tools: 'Three Musical Instrument of your choice'
    })).classDocument;
    const warmage = convertClass(buildTestClass({
      name: 'Warmage',
      tools: "One artisan's kit of your choice, one gaming set of your choice"
    })).classDocument;

    expect(findToolAdvancement(artificer).configuration.grants).toEqual(['tool:thief', 'tool:tinker']);
    expect(findToolAdvancement(artificer).configuration.choices).toEqual([
      {
        count: 1,
        pool: ['tool:art:*']
      }
    ]);

    expect(findToolAdvancement(bard).configuration.grants).toEqual([]);
    expect(findToolAdvancement(bard).configuration.choices).toEqual([
      {
        count: 3,
        pool: ['tool:music:*']
      }
    ]);

    expect(findToolAdvancement(warmage).configuration.choices).toEqual([
      {
        count: 1,
        pool: ['tool:art:*']
      },
      {
        count: 1,
        pool: ['tool:game:*']
      }
    ]);
  });

  test('uses dnd5e wildcard skill choices when a class can choose any skill', () => {
    const bard = convertClass(buildTestClass({
      name: 'Bard',
      numSkills: 3,
      proficiency: 'Strength, Acrobatics, Animal Handling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, Sleight of Hand, Stealth, Survival'
    })).classDocument;
    const skillAdvancement = bard.system.advancement.find((entry) => {
      if (entry.type !== 'Trait') return false;
      return entry.configuration?.choices?.some((choice) => choice.pool?.includes('skills:*'));
    });

    expect(skillAdvancement.configuration.choices).toEqual([
      {
        count: 3,
        pool: ['skills:*']
      }
    ]);
  });

  test('generates Bard scale value advancements compatible with dnd5e', () => {
    const bard = convertClass(buildTestClass({
      name: 'Bard',
      slotsReset: 'L',
      autolevels: [
        {
          level: 1,
          slots: [2, 2],
          counters: [
            { name: 'Spells Known', value: '4', reset: '' },
            { name: 'Bardic Inspiration', value: '%6', reset: 'S' }
          ],
          features: [buildTestFeature('Bardic Inspiration', 'A creature gains one Bardic Inspiration die, a d6.')]
        },
        {
          level: 2,
          slots: [2, 3],
          counters: [{ name: 'Spells Known', value: '5', reset: '' }],
          features: [buildTestFeature('Song of Rest (d6)', 'Extra healing.')]
        },
        {
          level: 3,
          slots: [2, 4, 2],
          counters: [{ name: 'Spells Known', value: '6', reset: '' }],
          features: [buildTestFeature('Expertise', 'Choose two skill proficiencies.')]
        },
        {
          level: 4,
          slots: [3, 4, 3],
          counters: [{ name: 'Spells Known', value: '7', reset: '' }],
          features: []
        },
        {
          level: 5,
          slots: [3, 4, 3, 2],
          counters: [{ name: 'Spells Known', value: '8', reset: '' }],
          features: [buildTestFeature('Bardic Inspiration (d8)', 'The die becomes a d8.')]
        },
        {
          level: 9,
          slots: [3, 4, 3, 3, 3, 1],
          counters: [{ name: 'Spells Known', value: '12', reset: '' }],
          features: [buildTestFeature('Song of Rest (d8)', 'Extra healing.')]
        },
        {
          level: 10,
          slots: [4, 4, 3, 3, 3, 2],
          counters: [{ name: 'Spells Known', value: '14', reset: '' }],
          features: [
            buildTestFeature('Bardic Inspiration (d10)', 'The die becomes a d10.'),
            buildTestFeature('Expertise Improvement', 'Choose two more skill proficiencies.'),
            buildTestFeature('Magical Secrets', 'Choose two spells from any classes.')
          ]
        },
        {
          level: 12,
          slots: [4, 4, 3, 3, 3, 2, 1],
          counters: [{ name: 'Spells Known', value: '15', reset: '' }],
          features: []
        },
        {
          level: 14,
          slots: [4, 4, 3, 3, 3, 2, 1, 1],
          counters: [{ name: 'Spells Known', value: '18', reset: '' }],
          features: [buildTestFeature('Magical Secrets', 'Choose two spells from any classes.')]
        },
        {
          level: 13,
          slots: [4, 4, 3, 3, 3, 2, 1, 1],
          counters: [{ name: 'Spells Known', value: '16', reset: '' }],
          features: [buildTestFeature('Song of Rest (d10)', 'Extra healing.')]
        },
        {
          level: 15,
          slots: [4, 4, 3, 3, 3, 2, 1, 1, 1],
          counters: [{ name: 'Spells Known', value: '19', reset: '' }],
          features: [buildTestFeature('Bardic Inspiration (d12)', 'The die becomes a d12.')]
        },
        {
          level: 17,
          slots: [4, 4, 3, 3, 3, 2, 1, 1, 1, 1],
          counters: [{ name: 'Spells Known', value: '20', reset: '' }],
          features: [buildTestFeature('Song of Rest (d12)', 'Extra healing.')]
        },
        {
          level: 18,
          slots: [4, 4, 3, 3, 3, 3, 1, 1, 1, 1],
          counters: [{ name: 'Spells Known', value: '22', reset: '' }],
          features: [buildTestFeature('Magical Secrets', 'Choose two spells from any classes.')]
        },
        {
          level: 20,
          slots: [4, 4, 3, 3, 3, 3, 2, 2, 1, 1],
          counters: [{ name: 'Spells Known', value: '22', reset: '' }],
          features: []
        }
      ]
    })).classDocument;
    const scaleByIdentifier = scaleAdvancementsByIdentifier(bard);
    const expertise = bard.system.advancement.filter((entry) => entry.type === 'Trait' && entry.configuration.mode === 'expertise');
    const magicalSecrets = bard.system.advancement.find((entry) => entry.type === 'ItemChoice' && entry.title === 'Magical Secrets');

    expect(scaleByIdentifier.inspiration._id).toBe('0Ybu5yMjplpTAHiE');
    expect(scaleByIdentifier.inspiration.configuration.scale).toEqual({
      1: { number: null, faces: 6, modifiers: [] },
      5: { number: null, faces: 8, modifiers: [] },
      10: { number: null, faces: 10, modifiers: [] },
      15: { number: null, faces: 12, modifiers: [] }
    });
    expect(scaleByIdentifier['song-of-rest'].configuration.scale).toEqual({
      2: { number: null, faces: 6, modifiers: [] },
      9: { number: null, faces: 8, modifiers: [] },
      13: { number: null, faces: 10, modifiers: [] },
      17: { number: null, faces: 12, modifiers: [] }
    });
    expect(scaleByIdentifier['cantrips-known'].configuration.scale).toEqual({
      1: { value: 2 },
      4: { value: 3 },
      10: { value: 4 }
    });
    expect(scaleByIdentifier['spells-known'].configuration.scale[20]).toBeUndefined();
    expect(scaleByIdentifier['spells-known'].configuration.scale[17]).toEqual({ value: 20 });
    expect(expertise.map((entry) => [entry._id, entry.level, entry.configuration.choices])).toEqual([
      ['cwu9uhmtcKhqli8W', 3, [{ count: 2, pool: ['skills:*'] }]],
      ['O2cVH7Y5kNfoUyLg', 10, [{ count: 2, pool: ['skills:*'] }]]
    ]);
    expect(magicalSecrets._id).toBe('EC1yNAV6khHilOhz');
    expect(magicalSecrets.configuration.choices).toEqual({
      10: { count: 2, replacement: false },
      14: { count: 2, replacement: false },
      18: { count: 2, replacement: false }
    });
  });

  test('generates core class scale value advancements beyond Bard', () => {
    const barbarian = convertClass(buildTestClass({
      name: 'Barbarian',
      autolevels: [
        {
          level: 1,
          counters: [{ name: 'Rage', value: '2', reset: 'L' }],
          features: [buildTestFeature('Rage', 'At 1st level, you have a +2 bonus to damage. Your bonus increases to +3 at 9th level and to +4 at 16th.')]
        },
        { level: 3, counters: [{ name: 'Rage', value: '3', reset: 'L' }], features: [] },
        { level: 9, counters: [], features: [buildTestFeature('Brutal Critical (1 die)', 'One additional die.')] },
        { level: 13, counters: [], features: [buildTestFeature('Brutal Critical (2 dice)', 'Two additional dice.')] },
        { level: 17, counters: [{ name: 'Rage', value: '6', reset: 'L' }], features: [buildTestFeature('Brutal Critical (3 dice)', 'Three additional dice.')] },
        { level: 20, counters: [], features: [buildTestFeature('Primal Champion', 'Unlimited rage.')] }
      ]
    })).classDocument;
    const monk = convertClass(buildTestClass({
      name: 'Monk',
      autolevels: [
        {
          level: 1,
          counters: [],
          features: [buildTestFeature('Martial Arts', 'The Monk Table:\nLevel | Martial Arts\n1st | 1d4\n5th | 1d6\n11th | 1d8\n17th | 1d10')]
        },
        { level: 2, counters: [], features: [buildTestFeature('Unarmored Movement', 'Your speed increases by 10 feet.')] },
        { level: 6, counters: [], features: [buildTestFeature('Unarmored Movement 2nd', 'Your speed increases by 15 feet.')] }
      ]
    })).classDocument;
    const rogue = convertClass(buildTestClass({
      name: 'Rogue',
      autolevels: [
        { level: 1, counters: [], features: [buildTestFeature('Sneak Attack', 'You deal an extra 1d6 damage.')] },
        { level: 3, counters: [], features: [buildTestFeature('Sneak Attack (2)', 'You deal an extra 2d6 damage.')] }
      ]
    })).classDocument;

    const barbarianScales = scaleAdvancementsByIdentifier(barbarian);
    const monkScales = scaleAdvancementsByIdentifier(monk);
    const rogueScales = scaleAdvancementsByIdentifier(rogue);

    expect(barbarianScales.rages.configuration.scale[20]).toEqual({ value: 999 });
    expect(barbarianScales['rage-damage'].configuration.scale[16]).toEqual({ value: 4 });
    expect(barbarianScales['brutal-critical'].configuration.scale[17]).toEqual({ value: 3 });
    expect(monkScales.die.configuration.scale[1]).toEqual({ number: null, faces: 4, modifiers: [] });
    expect(monkScales['unarmored-movement'].configuration.distance.units).toBe('ft');
    expect(rogueScales['sneak-attack'].configuration.scale[3]).toEqual({ number: 2, faces: 6, modifiers: [] });
  });

  test('maps wizard weapon proficiencies to dnd5e base item keys', () => {
    const wizard = convertClass(buildTestClass({
      name: 'Wizard',
      weapons: 'Daggers, Darts, Slings, Quarterstaffs, Light Crossbows'
    })).classDocument;

    expect(findWeaponAdvancement(wizard).configuration.grants).toEqual([
      'weapon:sim:dagger',
      'weapon:sim:dart',
      'weapon:sim:sling',
      'weapon:sim:quarterstaff',
      'weapon:sim:lightcrossbow'
    ]);
  });

  test('maps Unarmored Defense into the original dnd5e AC calculation effect', () => {
    const barbarian = convertClass(buildTestClass({
      name: 'Barbarian',
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Unarmored Defense', 'While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.\n\nSource:\tSynthetic Manual p. 2')
        ]
      }]
    }));
    const monk = convertClass(buildTestClass({
      name: 'Monk',
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Unarmored Defense', 'While you are wearing no armor and not wielding a shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.\n\nSource:\tSynthetic Manual p. 3')
        ]
      }]
    }));
    const brawler = convertClass(buildTestClass({
      name: 'Brawler (Tanares)',
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Tough as Nails', 'Brawlers are known to be tough as nails and are extremely resilient even when not wearing armor. While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit. Additionally, you are resistant to all damage types.\n\nSource:\tPlayer\'s Guide to Tanares p. 193')
        ]
      }]
    }));

    const barbarianFeature = barbarian.featureDocuments.find((entry) => entry.name === 'Unarmored Defense');
    const monkFeature = monk.featureDocuments.find((entry) => entry.name === 'Unarmored Defense');
    const brawlerFeature = brawler.featureDocuments.find((entry) => entry.name === 'Tough as Nails');

    expect(barbarianFeature.effects).toHaveLength(1);
    expect(barbarianFeature.effects[0].disabled).toBe(false);
    expect(barbarianFeature.effects[0].transfer).toBe(true);
    expect(barbarianFeature.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.attributes.ac.calc',
        mode: 5,
        value: 'unarmoredBarb'
      })
    ]);

    expect(monkFeature.effects).toHaveLength(1);
    expect(monkFeature.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.attributes.ac.calc',
        mode: 5,
        value: 'unarmoredMonk'
      })
    ]);

    expect(brawlerFeature.effects).toHaveLength(1);
    expect(brawlerFeature.effects[0].disabled).toBe(false);
    expect(brawlerFeature.effects[0].transfer).toBe(true);
    expect(brawlerFeature.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.attributes.ac.calc',
        mode: 5,
        value: 'unarmoredBarb'
      }),
      expect.objectContaining({
        key: 'system.traits.dr.value',
        mode: 2,
        value: 'acid;bludgeoning;cold;fire;force;lightning;necrotic;piercing;poison;psychic;radiant;slashing;thunder'
      })
    ]);
  });

  test('infers high-confidence passive effects from feature prose', () => {
    const result = convertClass(buildTestClass({
      name: 'Elementalist',
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Elemental Body', 'You have resistance to fire and cold damage. You are immune to poison damage and the poisoned condition. You gain darkvision out to 60 feet. Your walking speed increases by 10 feet. You gain a +1 bonus to AC.\n\nSource:\tSynthetic Manual p. 4')
        ]
      }]
    }));
    const feature = result.featureDocuments.find((entry) => entry.name === 'Elemental Body');
    const effect = feature.effects[0];

    expect(feature.effects).toHaveLength(1);
    expect(effect.disabled).toBe(false);
    expect(effect.transfer).toBe(true);
    expect(effect.flags['monster-creator'].fc5.inferredEffect).toBe(true);
    expect(effect.flags['monster-creator'].fc5.inferenceRules).toEqual(expect.arrayContaining([
      'damage-resistance',
      'damage-immunity',
      'condition-immunity',
      'sense-darkvision',
      'movement-walk',
      'flat-bonus-ac'
    ]));
    expect(effect.changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'system.traits.dr.value',
        mode: 2,
        value: 'cold;fire'
      }),
      expect.objectContaining({
        key: 'system.traits.di.value',
        mode: 2,
        value: 'poison'
      }),
      expect.objectContaining({
        key: 'system.traits.ci.value',
        mode: 2,
        value: 'poisoned'
      }),
      expect.objectContaining({
        key: 'system.attributes.senses.darkvision',
        mode: 4,
        value: '60'
      }),
      expect.objectContaining({
        key: 'system.attributes.movement.walk',
        mode: 2,
        value: '10'
      }),
      expect.objectContaining({
        key: 'system.attributes.ac.bonus',
        mode: 2,
        value: '+1'
      })
    ]));
  });

  test('infers runtime-conditional passive effects as disabled toggles', () => {
    const result = convertClass(buildTestClass({
      name: 'Berserker',
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Battle Trance', 'While raging, you have resistance to bludgeoning, piercing, and slashing damage. For 1 minute, your speed increases by 10 feet. You gain a +2 bonus to saving throws against spells.\n\nSource:\tSynthetic Manual p. 5')
        ]
      }]
    }));
    const feature = result.featureDocuments.find((entry) => entry.name === 'Battle Trance');

    expect(feature.effects).toHaveLength(3);
    expect(feature.effects.every((effect) => effect.disabled)).toBe(true);
    expect(feature.effects.every((effect) => effect.flags['monster-creator'].fc5.inferredEffect)).toBe(true);
    expect(feature.effects.map((effect) => effect.changes).flat()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'system.traits.dr.value',
        mode: 2,
        value: 'bludgeoning;piercing;slashing'
      }),
      expect.objectContaining({
        key: 'system.attributes.movement.bonus',
        mode: 2,
        value: '10'
      }),
      expect.objectContaining({
        key: 'system.bonuses.abilities.save',
        mode: 2,
        value: '+2'
      })
    ]));
    expect(feature.effects.map((effect) => effect.flags['monster-creator'].fc5.condition).filter(Boolean)).toHaveLength(3);
  });

  test('keeps inferred effects scoped to owner benefits', () => {
    const result = convertClass(buildTestClass({
      name: 'Shadow Master',
      autolevels: [{
        level: 3,
        counters: [],
        features: [
          buildTestFeature('Abyssal Eyes', 'When you choose this archetype at 3rd level, your eyes change to an inky black, granting you darkvision out to a range of 60 feet.\n\nSource:\tSynthetic Manual p. 6'),
          buildTestFeature('Aegis of Stone', 'The target gains resistance to nonmagical bludgeoning, piercing, and slashing damage for 1 minute.\n\nSource:\tSynthetic Manual p. 7')
        ]
      }]
    }));
    const eyes = result.featureDocuments.find((entry) => entry.name === 'Abyssal Eyes');
    const aegis = result.featureDocuments.find((entry) => entry.name === 'Aegis of Stone');

    expect(eyes.effects).toHaveLength(1);
    expect(eyes.effects[0].disabled).toBe(false);
    expect(eyes.effects[0].changes).toEqual([
      expect.objectContaining({
        key: 'system.attributes.senses.darkvision',
        mode: 4,
        value: '60'
      })
    ]);
    expect(aegis.effects).toHaveLength(0);
  });

  test('keeps mixed damage and condition immunity in the correct trait buckets', () => {
    const result = convertClass(buildTestClass({
      name: 'Primordial',
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Air Body', 'For the duration, you also gain resistance to all nonmagical bludgeoning, piercing, or slashing damage, and immunity to the grappled condition.\n\nSource:\tSynthetic Manual p. 8')
        ]
      }]
    }));
    const feature = result.featureDocuments.find((entry) => entry.name === 'Air Body');
    const changes = feature.effects.map((effect) => effect.changes).flat();

    expect(feature.effects).toHaveLength(1);
    expect(feature.effects[0].disabled).toBe(true);
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'system.traits.dr.value',
        mode: 2,
        value: 'bludgeoning;piercing;slashing'
      }),
      expect.objectContaining({
        key: 'system.traits.ci.value',
        mode: 2,
        value: 'grappled'
      })
    ]));
    expect(changes.some((change) => change.key === 'system.traits.di.value')).toBe(false);
  });

  test('maps mixed tool choice prose into valid tool choice pools and preserves unmapped phrases in flags', () => {
    const monk = convertClass(buildTestClass({
      name: 'Monk',
      tools: "Any one type of Artisan's Tools or any one Musical Instrument of your choice"
    })).classDocument;
    const pugilist = convertClass(buildTestClass({
      name: 'Pugilist',
      tools: "Your choice of one Artisan's Tools, Gaming Set, or Thieves' Tools"
    })).classDocument;
    const courier = convertClass(buildTestClass({
      name: 'Courier',
      tools: "Carpenter's Tools, Navigator's Tools, Musical Instrument"
    })).classDocument;
    const unknown = convertClass(buildTestClass({
      name: 'Oddball',
      tools: "Queen's Workshop"
    })).classDocument;

    expect(findToolAdvancement(monk).configuration.choices).toEqual([
      {
        count: 1,
        pool: ['tool:art:*', 'tool:music:*']
      }
    ]);

    expect(findToolAdvancement(pugilist).configuration.grants).toEqual([]);
    expect(findToolAdvancement(pugilist).configuration.choices).toEqual([
      {
        count: 1,
        pool: ['tool:art:*', 'tool:game:*', 'tool:thief']
      }
    ]);

    expect(findToolAdvancement(courier).configuration.grants).toEqual(['tool:carpenter', 'tool:navg']);
    expect(findToolAdvancement(courier).configuration.choices).toEqual([
      {
        count: 1,
        pool: ['tool:music:*']
      }
    ]);

    expect(unknown.flags['monster-creator'].fc5.unmappedToolProficiencies).toEqual(["Queen's Workshop"]);
  });

  test('keeps option-style features out of bogus subclass docs and suppresses textual ASI features', () => {
    const result = convertClass(buildTestClass({
      name: 'Warmage',
      spellAbility: 'Intelligence',
      traits: [{
        name: 'Warmage',
        text: 'Warmages bend cantrips into battlefield doctrine.\n\nSource:\tSynthetic Manual p. 2'
      }],
      autolevels: [
        {
          level: 1,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Arcane Fighting Style', 'You adopt a magical combat style.\n\nSource:\tSynthetic Manual p. 2'),
            buildTestFeature('Arcane Fighting Style: Blaster (HB)', 'You gain a +1 bonus to spell save DCs.\n\nSource:\tSynthetic Manual p. 2')
          ],
          counters: []
        },
        {
          level: 3,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Warmage House: House of Pawns', 'Versatile cantrip masters.\n\nSource:\tSynthetic Manual p. 3', { optional: true }),
            buildTestFeature('Promotion (House of Pawns)', 'You master adaptive tactics.\n\nSource:\tSynthetic Manual p. 3')
          ],
          counters: []
        },
        {
          level: 4,
          scoreImprovement: true,
          slots: [],
          features: [
            buildTestFeature('Ability Score Improvement', 'You gain the Ability Score Improvement feat.\n\nSource:\tSynthetic Manual p. 4', { optional: true })
          ],
          counters: []
        },
        {
          level: 8,
          scoreImprovement: true,
          slots: [],
          features: [
            buildTestFeature('Level 8: Ability Score Improvement', 'You gain the Ability Score Improvement feat.\n\nSource:\tSynthetic Manual p. 4', { optional: true }),
            buildTestFeature('Arcane Fighting Style: Blaster (House of Pawns)', 'You gain a +1 bonus to spell save DCs.\n\nSource:\tSynthetic Manual p. 5')
          ],
          counters: []
        }
      ]
    }));
    const subclassNames = result.subclassDocuments.map((entry) => entry.name);
    const featureNames = result.featureDocuments.map((entry) => entry.name);
    const hbBlaster = result.featureDocuments.find((entry) => entry.name === 'Arcane Fighting Style: Blaster (HB)');
    const pawnBlaster = result.featureDocuments.find((entry) => entry.name === 'Arcane Fighting Style: Blaster (House of Pawns)');

    expect(subclassNames).toEqual(['House of Pawns']);
    expect(subclassNames).not.toContain('Ability Score Improvement');
    expect(subclassNames).not.toContain('Blaster (House of Pawns)');
    expect(featureNames).toContain('Arcane Fighting Style: Blaster (HB)');
    expect(featureNames).toContain('Arcane Fighting Style: Blaster (House of Pawns)');
    expect(featureNames).not.toContain('Ability Score Improvement');
    expect(featureNames).not.toContain('Level 8: Ability Score Improvement');
    expect(hbBlaster.flags['monster-creator'].fc5.raw.ownerType).toBe('class');
    expect(hbBlaster.flags['monster-creator'].fc5.raw.subclassName).toBe('');
    expect(pawnBlaster.flags['monster-creator'].fc5.raw.ownerType).toBe('subclass');
    expect(pawnBlaster.flags['monster-creator'].fc5.raw.subclassName).toBe('House of Pawns');
    expect(result.classDocument.system.advancement.filter((entry) => entry.type === 'AbilityScoreImprovement').map((entry) => entry.level)).toEqual([4, 8]);
  });

  test('supports nested parenthetical subclass names when attaching subclass features', () => {
    const result = convertClass(buildTestClass({
      name: 'Wizard',
      hd: '6',
      proficiency: 'Intelligence, Wisdom',
      spellAbility: 'Intelligence',
      traits: [{
        name: 'Wizard',
        text: 'Wizards refine arcane study into traditions.\n\nSource:\tSynthetic Manual p. 6'
      }],
      autolevels: [
        {
          level: 2,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Arcane Tradition: Cantrip Adept (HB)', 'You specialize in advanced cantrip theory.\n\nSource:\tSynthetic Manual p. 6', { optional: true }),
            buildTestFeature('Arcane Alacrity (Cantrip Adept (HB))', 'You can cast a wizard cantrip as a bonus action.\n\nSource:\tSynthetic Manual p. 6')
          ],
          counters: []
        },
        {
          level: 10,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Adroit Caster (Cantrip Adept (HB))', 'Your cantrip riders last longer.\n\nSource:\tSynthetic Manual p. 7')
          ],
          counters: []
        }
      ]
    }));
    const subclass = result.subclassDocuments.find((entry) => entry.name === 'Cantrip Adept (HB)');
    const alacrity = result.featureDocuments.find((entry) => entry.name === 'Arcane Alacrity (Cantrip Adept (HB))');
    const adroit = result.featureDocuments.find((entry) => entry.name === 'Adroit Caster (Cantrip Adept (HB))');

    expect(subclass).toBeDefined();
    expect(subclass.system.classIdentifier).toBe('wizard');
    expect(subclass.system.advancement.map((entry) => entry.level)).toEqual([2, 10]);
    expect(alacrity.flags['monster-creator'].fc5.raw.ownerType).toBe('subclass');
    expect(alacrity.flags['monster-creator'].fc5.raw.subclassName).toBe('Cantrip Adept (HB)');
    expect(adroit.flags['monster-creator'].fc5.raw.ownerType).toBe('subclass');
    expect(adroit.flags['monster-creator'].fc5.raw.subclassName).toBe('Cantrip Adept (HB)');
  });

  test('document generation stays deterministic across repeated runs', () => {
    const parsed = parseFc5Xml(fixtureXml);
    const first = generateCompendiumDocuments(parsed);
    const second = generateCompendiumDocuments(parsed);

    expect(first).toStrictEqual(second);
    expect(deterministicId('stormblade|echo')).toBe(deterministicId('stormblade|echo'));
  });

  test('dedupes equivalent generated documents with different raw provenance', () => {
    const first = convertItem(buildTestItem('Test Yklwa', 'Tal\'Dorei Campaign Setting: Reborn p. 199'));
    const second = convertItem(buildTestItem('Test Yklwa', 'Tal\'Dorei Campaign Setting: Reborn p. 199 (Third Party)'));

    expect(first._id).toBe(second._id);
    expect(dedupeDocuments([first, second])).toHaveLength(1);
  });

  test('assigns generated pack documents under Monster Creator, source book, and content type folders', () => {
    const alchemist = convertClass(buildTestClass({
      name: 'Alchemist (Valda)',
      traits: [{
        name: 'Alchemist (Valda)',
        text: 'Potion rules.\n\nSource:\tValda\'s Spire of Secrets p. 27 (Indie)'
      }]
    })).classDocument;
    const wizard = convertClass(buildTestClass({
      name: 'Wizard',
      traits: [{
        name: 'Wizard',
        text: 'Wizard rules.\n\nSource:\tPlayer\'s Handbook (2014) p. 112'
      }]
    })).classDocument;
    const { folders, documents } = buildPackFolderDocuments([alchemist, wizard], {
      packName: 'fc5classes',
      sourceDir: 'fc5-classes',
      type: 'Item',
      folderName: 'Classes'
    });
    const root = folders.find((folder) => folder.name === 'Monster Creator');
    const valda = folders.find((folder) => folder.name === 'Valda\'s Spire of Secrets');
    const valdaClasses = folders.find((folder) => folder.name === 'Classes' && folder.folder === valda._id);
    const phb = folders.find((folder) => folder.name === 'Player\'s Handbook (2014)');

    expect(root._key).toBe(`!folders!${root._id}`);
    expect(valda.folder).toBe(root._id);
    expect(phb.folder).toBe(root._id);
    expect(documents.find((entry) => entry.name === 'Alchemist (Valda)').folder).toBe(valdaClasses._id);
  });

  test('uses feature source as class source when auxiliary classes have no traits', () => {
    const result = convertClass(buildTestClass({
      name: 'Auxiliary Level: Animal Master (Valda)',
      traits: [],
      autolevels: [{
        level: 1,
        counters: [],
        features: [
          buildTestFeature('Animal Master', 'Prerequisite: 3rd Level\n\n• Skills: Animal Handling\n\nSource:\tValda\'s Spire of Secrets p. 276 (Indie)')
        ]
      }]
    })).classDocument;

    expect(result.system.source.book).toBe('Valda\'s Spire of Secrets');
    expect(result.system.source.page).toBe('276');
    expect(result.flags['monster-creator'].fc5.sourceBook).toBe('Valda\'s Spire of Secrets');
  });

  test('extracts source metadata from trailing source lines', () => {
    const result = splitSourceText(`A short rules text.\n\nSource:\tPrimer (2024) p. 99`);

    expect(result.content).toBe('A short rules text.');
    expect(result.source.book).toBe('Primer (2024)');
    expect(result.source.page).toBe('99');
    expect(result.source.rules).toBe('2024');
    expect(result.source.sourceCategory).toBe('unknown');
  });

  test('keeps post-page source tags out of the book name', () => {
    const result = splitSourceText(`A short rules text.\n\nSource:\tValda's Spire of Secrets p. 159 (Homebrew)`);
    const multiSource = splitSourceText(`A short rules text.\n\nSource:\tValda's Spire of Secrets p. 308 (Homebrew), Player's Handbook (2014)`);
    const unpaged = splitSourceText(`A short rules text.\n\nSource:\tValda's Spire of Secrets (Homebrew)`);
    const indie = splitSourceText(`A short rules text.\n\nSource:\tValda's Spire of Secrets p. 27 (Indie)`);

    expect(result.source.book).toBe("Valda's Spire of Secrets");
    expect(result.source.page).toBe('159');
    expect(result.source.sourceCategory).toBe('homebrew');
    expect(multiSource.source.book).toBe("Valda's Spire of Secrets");
    expect(multiSource.source.page).toBe('308');
    expect(multiSource.source.rules).toBe('');
    expect(multiSource.source.sourceCategory).toBe('homebrew');
    expect(unpaged.source.book).toBe("Valda's Spire of Secrets");
    expect(unpaged.source.page).toBe('');
    expect(unpaged.source.sourceCategory).toBe('homebrew');
    expect(indie.source.book).toBe("Valda's Spire of Secrets");
    expect(indie.source.page).toBe('27');
  });

  test('infers official rules-era metadata from published source books without explicit edition tags', () => {
    const published = splitSourceText(`Subclass rules.\n\nSource:\tXanathar's Guide to Everything p. 47`);
    const homebrew = splitSourceText(`Subclass rules.\n\nSource:\tMordenkainen's Codex of Allies v1.3 p. 24 (Homebrew)`);
    const ua = splitSourceText(`Subclass rules.\n\nSource:\tUnearthed Arcana: Gothic Heroes`);
    const thirdParty = splitSourceText(`Weapon rules.\n\nSource:\tTal'Dorei Campaign Setting: Reborn p. 199`);

    expect(published.source.book).toBe("Xanathar's Guide to Everything");
    expect(published.source.rules).toBe('2014');
    expect(published.source.sourceCategory).toBe('official');
    expect(homebrew.source.sourceCategory).toBe('homebrew');
    expect(homebrew.source.rules).toBe('');
    expect(ua.source.sourceCategory).toBe('ua');
    expect(thirdParty.source.sourceCategory).toBe('third-party');
  });

  test('tags generated classes and subclasses with normalized FC5 source categories for subclass filtering', () => {
    const result = convertClass(buildTestClass({
      name: 'Rogue',
      hd: '8',
      proficiency: 'Dexterity, Intelligence',
      traits: [{
        name: 'Rogue',
        text: "Rogues rely on precision and guile.\n\nSource:\tPlayer's Handbook (2014) p. 94"
      }],
      autolevels: [
        {
          level: 3,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Roguish Archetype: Assassin', "Deadly killers.\n\nSource:\tPlayer's Handbook (2014) p. 97", { optional: true }),
            buildTestFeature('Roguish Archetype: Scout', "Skirmishing experts.\n\nSource:\tXanathar's Guide to Everything p. 47", { optional: true }),
            buildTestFeature('Roguish Archetype: Acrobat (HB)', "Agile performers.\n\nSource:\tMordenkainen's Codex of Allies v1.3 p. 24 (Homebrew)", { optional: true }),
            buildTestFeature('Roguish Archetype: Inquisitive (UA)', 'Keen investigators.\n\nSource:\tUnearthed Arcana: Gothic Heroes', { optional: true })
          ],
          counters: []
        },
        {
          level: 9,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Death Strike (Assassin)', "You ambush with precision.\n\nSource:\tPlayer's Handbook (2014) p. 97"),
            buildTestFeature('Superior Mobility (Scout)', "You cross the battlefield quickly.\n\nSource:\tXanathar's Guide to Everything p. 47"),
            buildTestFeature('Center Stage (Acrobat (HB))', "You steal the spotlight.\n\nSource:\tMordenkainen's Codex of Allies v1.3 p. 24 (Homebrew)"),
            buildTestFeature('Ear for Deceit (Inquisitive (UA))', 'Your instincts sharpen.\n\nSource:\tUnearthed Arcana: Gothic Heroes')
          ],
          counters: []
        }
      ]
    }));
    const flags = result.classDocument.flags['monster-creator'].fc5;
    const assassin = result.subclassDocuments.find((entry) => entry.name === 'Assassin');
    const scout = result.subclassDocuments.find((entry) => entry.name === 'Scout');
    const acrobat = result.subclassDocuments.find((entry) => entry.name === 'Acrobat (HB)');
    const inquisitive = result.subclassDocuments.find((entry) => entry.name === 'Inquisitive (UA)');

    expect(flags.sourceCategory).toBe('official');
    expect(result.classDocument.system.source.rules).toBe('2014');
    expect(assassin.system.source.rules).toBe('2014');
    expect(assassin.flags['monster-creator'].fc5.sourceCategory).toBe('official');
    expect(scout.system.source.rules).toBe('2014');
    expect(scout.flags['monster-creator'].fc5.sourceCategory).toBe('official');
    expect(acrobat.flags['monster-creator'].fc5.sourceCategory).toBe('homebrew');
    expect(inquisitive.flags['monster-creator'].fc5.sourceCategory).toBe('ua');
  });

  test('keeps generic subclass placeholder features out of class grants', () => {
    const result = convertClass(buildTestClass({
      name: 'Rogue',
      hd: '8',
      traits: [{
        name: 'Rogue',
        text: "Rogues rely on precision and guile.\n\nSource:\tPlayer's Handbook (2014) p. 94"
      }],
      autolevels: [
        {
          level: 3,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Sneak Attack (2)', "Your sneak attack improves.\n\nSource:\tPlayer's Handbook (2014) p. 96"),
            buildTestFeature('Roguish Archetype', "You choose an archetype.\n\nSource:\tPlayer's Handbook (2014) p. 96"),
            buildTestFeature('Roguish Archetype: Arcane Trickster', "You enhance your fine-honed skills with magic.\n\nSource:\tPlayer's Handbook (2014) p. 97", { optional: true }),
            buildTestFeature('Roguish Archetype: Assassin', "You focus your training on the grim art of death.\n\nSource:\tPlayer's Handbook (2014) p. 97", { optional: true }),
            buildTestFeature('Roguish Archetype: Thief', "You hone your skills in the larcenous arts.\n\nSource:\tPlayer's Handbook (2014) p. 97", { optional: true }),
            buildTestFeature('Assassinate (Assassin)', "You are at your deadliest when you get the drop on your enemies.\n\nSource:\tPlayer's Handbook (2014) p. 97"),
            buildTestFeature('Fast Hands (Thief)', "You can use your Cunning Action to make checks with thieves' tools.\n\nSource:\tPlayer's Handbook (2014) p. 97"),
            buildTestFeature('Mage Hand Legerdemain (Arcane Trickster)', "You can make your mage hand invisible.\n\nSource:\tPlayer's Handbook (2014) p. 98")
          ],
          counters: []
        },
        {
          level: 9,
          scoreImprovement: false,
          slots: [],
          features: [
            buildTestFeature('Sneak Attack (5)', "Your sneak attack improves again.\n\nSource:\tPlayer's Handbook (2014) p. 96"),
            buildTestFeature('Roguish Archetype Feature', "Your archetype grants you a feature.\n\nSource:\tPlayer's Handbook (2014) p. 96"),
            buildTestFeature('Infiltration Expertise (Assassin)', "You can create false identities.\n\nSource:\tPlayer's Handbook (2014) p. 97"),
            buildTestFeature('Supreme Sneak (Thief)', "You have advantage on Dexterity (Stealth) checks.\n\nSource:\tPlayer's Handbook (2014) p. 97"),
            buildTestFeature('Magical Ambush (Arcane Trickster)', "Your magic from hiding is harder to resist.\n\nSource:\tPlayer's Handbook (2014) p. 98")
          ],
          counters: []
        }
      ]
    }));

    const classFeatureNames = result.featureDocuments
      .filter((entry) => entry.flags['monster-creator'].fc5.raw.ownerType === 'class')
      .map((entry) => entry.name);
    const assassin = result.subclassDocuments.find((entry) => entry.name === 'Assassin');
    const subclassAdvancement = result.classDocument.system.advancement.find((entry) => entry.type === 'Subclass');

    expect(subclassAdvancement.level).toBe(3);
    expect(subclassAdvancement.title).toBe('Roguish Archetype');
    expect(classFeatureNames).toContain('Sneak Attack (2)');
    expect(classFeatureNames).toContain('Sneak Attack (5)');
    expect(classFeatureNames).not.toContain('Roguish Archetype');
    expect(classFeatureNames).not.toContain('Roguish Archetype Feature');
    expect(assassin.system.advancement).toEqual([
      expect.objectContaining({
        level: 3,
        configuration: expect.objectContaining({
          items: [
            expect.objectContaining({
              uuid: expect.stringContaining('Compendium.monster-creator.fc5features.Item.')
            })
          ]
        })
      }),
      expect.objectContaining({ level: 9 })
    ]);
    expect(result.featureDocuments.find((entry) => entry.name === 'Assassinate (Assassin)').flags['monster-creator'].fc5.raw.subclassName).toBe('Assassin');
  });

  test('matches edition-suffixed class names back to their source trait text', () => {
    const result = convertClass(buildTestClass({
      name: 'Rogue [2024]',
      traits: [{
        name: 'Rogue',
        text: "Rogues rely on cunning.\n\nSource:\tPlayer's Handbook (2024) p. 129"
      }]
    }));

    expect(result.classDocument.system.identifier).toBe('rogue-2024');
    expect(result.classDocument.system.source.book).toBe("Player's Handbook (2024)");
    expect(result.classDocument.system.source.rules).toBe('2024');
    expect(result.classDocument.flags['monster-creator'].fc5.sourceCategory).toBe('official');
  });
});
