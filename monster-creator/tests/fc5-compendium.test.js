const fs = require('fs');
const path = require('path');

const fixturePath = path.join(__dirname, 'fixtures', 'fc5-compendium.fixture.xml');
const fixtureXml = fs.readFileSync(fixturePath, 'utf8');

const {
  convertClass,
  convertItem,
  convertSpell,
  deterministicId,
  generateCompendiumDocuments,
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

function findToolAdvancement(classDocument) {
  return classDocument.system.advancement.find((entry) => {
    if (entry.type !== 'Trait') return false;
    const grants = entry.configuration?.grants || [];
    const choices = entry.configuration?.choices || [];
    return grants.some((grant) => grant.startsWith('tool:'))
      || choices.some((choice) => (choice.pool || []).some((grant) => grant.startsWith('tool:')));
  });
}

describe('FC5 compendium conversion', () => {
  test('parses the synthetic FC5 fixture into top-level records', () => {
    const parsed = parseFc5Xml(fixtureXml);

    expect(parsed.classes).toHaveLength(1);
    expect(parsed.spells).toHaveLength(1);
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
      tools: '3 Musical Instruments'
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

  test('extracts source metadata from trailing source lines', () => {
    const result = splitSourceText(`A short rules text.\n\nSource:\tPrimer (2024) p. 99`);

    expect(result.content).toBe('A short rules text.');
    expect(result.source.book).toBe('Primer (2024)');
    expect(result.source.page).toBe('99');
    expect(result.source.rules).toBe('2024');
    expect(result.source.sourceCategory).toBe('unknown');
  });

  test('infers official rules-era metadata from published source books without explicit edition tags', () => {
    const published = splitSourceText(`Subclass rules.\n\nSource:\tXanathar's Guide to Everything p. 47`);
    const homebrew = splitSourceText(`Subclass rules.\n\nSource:\tMordenkainen's Codex of Allies v1.3 p. 24 (Homebrew)`);
    const ua = splitSourceText(`Subclass rules.\n\nSource:\tUnearthed Arcana: Gothic Heroes`);

    expect(published.source.book).toBe("Xanathar's Guide to Everything");
    expect(published.source.rules).toBe('2014');
    expect(published.source.sourceCategory).toBe('official');
    expect(homebrew.source.sourceCategory).toBe('homebrew');
    expect(homebrew.source.rules).toBe('');
    expect(ua.source.sourceCategory).toBe('ua');
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
