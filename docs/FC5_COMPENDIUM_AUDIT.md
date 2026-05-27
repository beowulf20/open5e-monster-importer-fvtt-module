# FC5 Complete Compendium Audit

Date: 2026-05-27

Input XML: `tmp/Complete_Compendium_5e.xml`

Generated pack counts:

- `fc5-spells`: 2488
- `fc5-items`: 9746
- `fc5-classes`: 64
- `fc5-subclasses`: 1090
- `fc5-features`: 8218

Live Foundry runtime checked:

- Foundry: `14.363`
- dnd5e: `5.3.3`
- World: `testao`
- User: `test`
- Monster Creator active: `true`
- Runtime module version reported by Foundry: `1.0.0`

## Findings And Fixes

### 1. Trait effects inferred from offensive or non-owner prose

Status: fixed.

Symptoms:

- Text like `your attacks ignore resistance` was generating owner damage resistance.
- Text about familiars, targets, weapons, companions, constructs, or creatures could transfer immunities/resistances to the actor.

Examples found before the fix:

- `Adaptable Combatant (Path of the Old Gods (HB))`
- `Davy Jones' Locker (Circle of the Deep (HB))`
- `Origami Familiar (Origami Mage (TP))`

Fix:

- Require owner-benefit grammar for damage traits, such as `you gain resistance to` or `you are immune to`.
- Reject offensive and non-owner contexts such as `ignore resistance`, `overcoming resistance`, `your attacks`, `target`, `familiar`, `servant`, `construct`, `weapon`, `creature`, and `companion`.

Verification:

- These example documents now generate no transferred owner trait effects.

### 2. `all damage except X` included the excluded type

Status: fixed.

Symptoms:

- `all damage except psychic damage` included `psychic`.
- `all damage except force damage` included `force`.

Examples found before the fix:

- `Bear (Path of the Totem Warrior)`
- `Phantom State (Bog Phantom (HB))`

Fix:

- Parse `except <damage type> damage` and `other than <damage type> damage`.
- Remove excluded damage types after expanding `all damage`.

Verification:

- `Bear (Path of the Totem Warrior)` now emits all standard damage resistance values except `psychic`.
- The inferred effect is disabled because the feature is conditional on raging.

### 3. Sense inference used invalid paths and captured shared range text

Status: fixed.

Symptoms:

- Inferred sense effects used `system.attributes.senses.darkvision`.
- dnd5e 5.3 expects `system.attributes.senses.ranges.darkvision`.
- Shared or target range text such as `creatures within 10 feet` could be captured as owner darkvision.

Examples found before the fix:

- `Eyes of Night (Twilight Domain)` generated spurious `darkvision = 10`.
- `Moonlight Warrior (Way of the Moon Soul (HB))` could duplicate darkvision changes.

Fix:

- Emit sense changes through `system.attributes.senses.ranges.<sense>`.
- Parse `increase by` separately from `increase to`.
- Reject sharing/granting clauses aimed at creatures, allies, or targets.
- Anchor sense inference to owner sense grammar.

Verification:

- `Eyes of Night (Twilight Domain)` now emits one `system.attributes.senses.ranges.darkvision` upgrade to `300`.
- Static check found `0` inferred sense paths outside `system.attributes.senses.ranges.*`.

### 4. Activated or limited-use features generated enabled transfer effects

Status: fixed.

Symptoms:

- Inferred passive effects on activated or limited-use features could be enabled by default.

Examples found before the fix:

- `Invincible Conqueror`
- `Dig Deep`
- Rage-style conditional resistance features

Fix:

- Pass activation/counter context into passive inference.
- Force inferred effects disabled when the feature has activation or limited uses.
- Treat `as an action`, `as a bonus action`, `as a reaction`, `while`, `against`, and time windows like `for one minute` as runtime conditions.

Verification:

- Runtime-conditional inferred effects are disabled toggles.

### 5. Duplicate effect removal missed equivalent numeric values

Status: fixed.

Symptoms:

- Explicit modifier effects using `+10` and inferred effects using `10` were treated as different.

Example found before the fix:

- `Fast Movement`

Fix:

- Normalize numeric effect values in duplicate signatures.

Verification:

- `Fast Movement` now keeps only the explicit `system.attributes.movement.bonus = +10` effect.

### 6. Trait values were previously packed into semicolon strings

Status: fixed.

Symptoms:

- Values like `acid;bludgeoning;cold` would not be split by Foundry Active Effect `Add`.

Fix:

- Emit one `system.traits.*.value` change per trait value.

Verification:

- Static check found `0` semicolon-packed effect values.
- `Tough as Nails` emits 13 separate `system.traits.dr.value` changes.

### 7. Empty source books on generated item documents

Status: fixed for generated item documents.

Symptoms:

- Unsourced subclass/feature documents inherited no source.
- A few spell-shaped feature documents had no source text at all.

Fix:

- Class/subclass features inherit owner source when their own text lacks a source line.
- Unsourced spell-shaped features fall back to `Unknown Source`.

Verification:

- Static check found `0` generated item documents in `fc5-subclasses` and `fc5-features` with empty `system.source.book`.

### 8. Feature identifier collisions with different content

Status: fixed.

Symptoms:

- Duplicate feature identifiers existed for different generated content.

Examples found before the fix:

- `Bushcraft: Hide in Plain Sight`
- `Illusory Strikes (The Trickster)`
- `Mystic Talent: Precognition III`
- `Mystic Talent: Precognition IV`

Fix:

- Disambiguate duplicate feature identifiers with a stable document-id suffix when the colliding documents have different content.
- Apply the pass after final feature dedupe so spell-shaped feature documents are included.

Verification:

- Static check found `0` content-varying feature identifier collisions.

### 9. Class documents used legacy hit-die fields

Status: fixed.

Symptoms:

- Class docs emitted `system.hitDice` and `system.hitDiceUsed`.
- dnd5e 5.3 uses `system.hd`.

Fix:

- Emit:

```json
{
  "hd": {
    "denomination": "d8",
    "spent": 0,
    "additional": ""
  }
}
```

Verification:

- Static check found `0` class documents with legacy `hitDice` or `hitDiceUsed`.

## Clean Checks

After fixes and regeneration:

- Empty generated item sources in `fc5-subclasses` and `fc5-features`: `0`
- Content-varying feature identifier collisions: `0`
- Legacy class hit-die fields: `0`
- Bad inferred sense paths or semicolon-packed effect values: `0`
- Focused Jest suite: `39` passing tests

Current inferred effect coverage after the stricter rules:

- Feature documents with inferred effects: `511`
- Inferred effects: `562`
- Disabled runtime-condition inferred effects: `374`

Top inferred rules:

- `damage-resistance`: 227
- `condition-immunity`: 118
- `damage-immunity`: 58
- `flat-bonus-ac`: 56
- `sense-darkvision`: 36
- `movement-walk`: 35
- `movement-bonus`: 25

## Live Foundry Notes

Live runtime checks confirmed:

- Chrome remote debugging was reachable at `127.0.0.1:9222`.
- Login succeeded as `.env` user `test` with no password value present.
- Monster Creator was active.
- All five generated FC5 packs were present in `game.packs` with expected index counts.
- `Tough as Nails` loaded through Foundry and validated with separate trait changes before the later rebuild attempt.

Live rebuild blocker:

- `npm run build` could not copy the updated packs into `FOUNDRY_MONSTER_CREATOR_PATH`.
- Error: `EACCES: permission denied, unlink .../packs/fc5-classes/000005.ldb`.
- Likely cause: Foundry or Windows has the LevelDB pack file open.
- Required follow-up: close Foundry and any file explorer holding the module directory, then rerun `npm run build` before final live validation of the updated generated packs.

