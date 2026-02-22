const fs = require('fs');
const path = require('path');
const fixturesPath = path.join(__dirname, 'fixtures', 'open5e-monsters.fixture.json');
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
const {
  normalizeOpen5eMonster,
  toAbilityScores,
  toMovement,
  toBiography,
  toWotcStatblockText,
  buildMonsterActorPayload
} = require('../scripts/statblock-formatter');

describe('Open5e monster normalization and formatting', () => {
  test('full payload maps to expected DnD5e actor system values', () => {
    const payload = buildMonsterActorPayload(fixtures.full);

    expect(payload.name).toBe('Aboleth');
    expect(payload.type).toBe('npc');
    expect(payload.img).toBe('https://example.com/aboleth.png');
    expect(payload.system.attributes.hp.value).toBe(171);
    expect(payload.system.attributes.hp.max).toBe(171);
    expect(payload.system.attributes.ac.value).toBe(17);
    expect(payload.system.attributes.movement.walk.value).toBe(10);
    expect(payload.system.attributes.movement.fly.value).toBe(60);
    expect(payload.system.abilities.str.value).toBe(20);
    expect(payload.system.abilities.dex.value).toBe(12);
    expect(payload.system.abilities.con.value).toBe(18);
    expect(payload.system.abilities.int.value).toBe(20);
    expect(payload.system.abilities.wis.value).toBe(20);
    expect(payload.system.abilities.cha.value).toBe(18);
    expect(payload.system.details.cr.value).toBe(11);
    expect(payload.system.details.alignment.value).toBe('chaotic evil');
    expect(payload.system.details.type.value).toBe('Aberration');
    expect(payload.system.size).toBe('Large');
    expect(payload.system.biography.value).toContain('This abyssal intellect lurks beneath the waves.');
    expect(payload.system.biography.value).toContain('Languages: Deep Speech, telepathy 120 ft.');
    expect(payload.system.biography.value).toContain('Saving Throws: Dexterity +5');
    expect(payload.system.biography.value).toContain('Skills: History +9');
    expect(payload.system.biography.value).toContain('Senses: Darkvision 120 ft.');
    expect(payload.system.biography.value).toContain('Damage Immunities: cold');
    expect(payload.system.biography.value).toContain('Damage Resistances: fire');
  });

  test('sparse payload uses safe defaults', () => {
    const payload = buildMonsterActorPayload(fixtures.sparse);

    expect(payload.system.attributes.hp.value).toBe(24);
    expect(payload.system.attributes.ac.value).toBe(10);
    expect(payload.system.abilities.str.value).toBe(10);
    expect(payload.system.abilities.dex.value).toBe(10);
    expect(payload.system.abilities.con.value).toBe(10);
    expect(payload.system.abilities.int.value).toBe(10);
    expect(payload.system.abilities.wis.value).toBe(10);
    expect(payload.system.abilities.cha.value).toBe(10);
    expect(payload.system.details.alignment.value).toBe('unaligned');
    expect(payload.system.details.type.value).toBe('Beast');
    expect(payload.system.size).toBe('Medium');
    expect(payload.system.attributes.movement).toEqual({});
    expect(payload.img).toBe('icons/svg/mystery-man.svg');
  });

  test('movement normalization ignores invalid values and unknown keys', () => {
    const movement = toMovement(fixtures.multiModal);

    expect(movement).toEqual({
      walk: { value: 25 },
      fly: { value: 60 },
      climb: { value: 15 },
      swim: { value: 0 }
    });
  });

  test('biography formatting includes ordered traits and actions with sanitized characters', () => {
    const text = toBiography(normalizeOpen5eMonster(fixtures.multiModal));

    expect(text).toContain('A crocodile with wings that hunts from above and below.');
    expect(text).toContain('Traits:');
    expect(text).toContain('Amphibious: It breathes water and air.');
    expect(text).toContain('Actions:');
    expect(text).toContain('Tail Lash: One target takes 1d8.');
    expect(text).not.toContain('\u2022');
  });

  test('buildMonsterActorPayload preserves Open5E source metadata', () => {
    const payload = buildMonsterActorPayload(fixtures.full);
    const flags = payload.flags['monster-creator'];

    expect(flags).toBeDefined();
    expect(flags.open5e.sourceKey).toBe('a5e-mm_aboleth');
    expect(flags.open5e.sourceSlug).toBe('a5e-mm_aboleth');
    expect(flags.open5e.sourceUrl).toBe(fixtures.full.url);
    expect(flags.open5e.sourceName).toBe('Monstrous Menagerie');
    expect(flags.open5e.raw).toEqual(fixtures.full);
  });

  test('build payload is idempotent', () => {
    const first = buildMonsterActorPayload(fixtures.full);
    const second = buildMonsterActorPayload(fixtures.full);

    expect(first).toStrictEqual(second);
  });

  test('formatter functions do not mutate input object', () => {
    const clone = JSON.parse(JSON.stringify(fixtures.full));
    normalizeOpen5eMonster(fixtures.full);
    toMovement(fixtures.full);
    toAbilityScores(fixtures.full.ability_scores);

    expect(fixtures.full).toStrictEqual(clone);
  });

  test('actor payload contract for Actor.create', () => {
    const payload = buildMonsterActorPayload(fixtures.full);

    expect(payload).toMatchObject({
      name: expect.any(String),
      type: 'npc',
      img: expect.any(String),
      system: expect.any(Object),
      flags: expect.any(Object)
    });
    expect(payload.flags['monster-creator'].open5e).toBeDefined();
    expect(payload.system.abilities).toBeDefined();
    expect(payload.system.attributes).toBeDefined();
    expect(payload.system.details).toBeDefined();
  });

  test('toWotcStatblockText follows requested block style', () => {
    const text = toWotcStatblockText(buildMonsterActorPayload(fixtures.full));
    const lines = text.split('\n');

    expect(lines[0]).toBe('Aboleth');
    expect(lines[1]).toBe('Large Aberration, chaotic evil');
    expect(lines[2]).toContain('Armor Class 17');
    expect(lines[3]).toContain('Hit Points 171');
    expect(lines[3]).toContain('(18d10+72)');
    expect(lines[4]).toContain('Speed 10 ft., Fly 60 ft., Swim 40 ft.');
    expect(lines[5]).toMatch(/^STR /);
    expect(lines).toContain('Traits');
    expect(lines).toContain('Languages Deep Speech, telepathy 120 ft.');
    expect(lines).toContain('Saving Throws Dexterity +5, Constitution +8, Intelligence +9, Wisdom +9');
    expect(lines).toContain('Challenge 11 (7200 XP)');
    expect(text).toContain('Amphibious.');
    expect(text).toContain('Actions');
    expect(text).toContain('Tentacle.');
  });

  test('toWotcStatblockText normalizes raw Open5E payloads before rendering', () => {
    const text = toWotcStatblockText(fixtures.full);

    expect(text).toContain('Armor Class 17');
    expect(text).toContain('Hit Points 171');
    expect(text).toContain('STR 20 (+5)');
    expect(text).toContain('Challenge 11 (7200 XP)');
    expect(text).toContain('Languages Deep Speech, telepathy 120 ft.');
    expect(text).toContain('Legendary Actions');
    expect(text).toContain('Baleful Charm.');
    expect(text).toContain('Move.');
    expect(text).toContain('Innate Spellcasting.');
    expect(text).not.toContain('The Aboleth Can Take 2 Legendary Actions.');
  });

  test('robustly handles non-primitive fields from API payloads', () => {
    const weird = {
      name: 'Glitch Fiend',
      speed_all: {
        walk: { value: 'Ex' },
        fly: { number: 30 },
        climb: { distance: 20 }
      },
      size: { name: 'Small', key: 'small' },
      type: { name: 'Undead', key: 'undead' },
      alignment: 'chaotic evil',
      armor_class: { value: 13 },
      hit_points: { value: 44 },
      hit_dice: { value: '9d6+5' },
      challenge_rating_decimal: { value: '2' },
      ability_scores: {
        strength: { value: 14 },
        dexterity: 12,
        constitution: 16,
        intelligence: 8,
        wisdom: 10,
        charisma: 9
      },
      saving_throws: { wisdom: -1 },
      traits: [
        { name: 'Languages', desc: { value: 'Common' } },
        { name: 'Senses', desc: { value: 'Darkvision 60 ft.' } }
      ]
    };

    const text = toWotcStatblockText(buildMonsterActorPayload(weird));

    expect(text).not.toMatch(/\[object Object\]/);
    expect(text).toContain('Speed Fly 30 ft., Climb 20 ft.');
  });

  test('formats attack entries without description using hit/damage rules', () => {
    const payload = {
      name: 'Gnasher',
      size: 'Small',
      type: 'Beast',
      alignment: 'neutral',
      speed_all: {
        walk: 25
      },
      armor_class: 13,
      hit_points: 38,
      hit_dice: '5d8+10',
      challenge_rating_decimal: '2',
      ability_scores: {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 4,
        wisdom: 12,
        charisma: 8
      },
      actions: [
        {
          name: 'Bite',
          attack_type: 'WEAPON',
          attacks: [
            {
              attack_type: 'WEAPON',
              to_hit_mod: 5,
              range: 20,
              long_range: 60,
              damage_die_count: 1,
              damage_die_type: 'd8',
              damage_bonus: 3,
              damage_type: {
                name: 'piercing'
              },
              extra_damage_die_count: 1,
              extra_damage_die_type: 'd6',
              extra_damage_bonus: 0,
              extra_damage_type: {
                name: 'poison'
              }
            }
          ]
        }
      ]
    };

    const text = toWotcStatblockText(buildMonsterActorPayload(payload));
    expect(text).toContain('Bite. Ranged Weapon Attack: +5 to hit, range 20/60 ft., one target.');
    expect(text).toContain('Hit: 7.5 (1d8 + 3) piercing damage.');
    expect(text).toContain('It deals 3.5 (1d6) poison damage as well.');
  });

  test('uses fallback damage type when primary type is not present', () => {
    const payload = {
      name: 'Tentacled Horror',
      size: 'Medium',
      type: 'Aberration',
      alignment: 'chaotic evil',
      speed_all: {
        walk: 30
      },
      armor_class: 16,
      hit_points: 66,
      hit_dice: '12d10+6',
      challenge_rating_decimal: '6',
      ability_scores: {
        strength: 18,
        dexterity: 12,
        constitution: 16,
        intelligence: 10,
        wisdom: 11,
        charisma: 10
      },
      actions: [
        {
          name: 'Crushing Tentacle',
          attacks: [
            {
              attack_type: 'WEAPON',
              to_hit_mod: 7,
              reach: 10,
              damage_die_count: 2,
              damage_die_type: 'd8',
              damage_bonus: 4,
              damage_type: null,
              extra_damage_type: {
                name: 'bludgeoning',
                key: 'bludgeoning'
              }
            }
          ]
        }
      ]
    };

    const text = toWotcStatblockText(buildMonsterActorPayload(payload));
    expect(text).toContain('Crushing Tentacle. Melee Weapon Attack: +7 to hit, reach 10 ft., one target.');
    expect(text).toContain('Hit: 13 (2d8 + 4) bludgeoning damage.');
    expect(text).not.toContain('as well');
  });
});
