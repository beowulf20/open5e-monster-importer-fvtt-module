# TODO

## FC5 Passive Effect Inference Engine

Build a broader rule-based inference layer for generated FC5 compendium documents so Complete Compendium content produces useful dnd5e Active Effects from prose when the mapping is safe.

Status: initial generation-wide implementation is in place. This is not an item-specific patch for `Compendium.monster-creator.fc5features.Item.9ll9eCqcJVQLTUmr`; that item is one example of the shared FC5 feature prose inference path. The generator now applies the same rule runner across generated class and subclass feature documents.

Desired shape:

- [x] Run inference after explicit FC5 modifiers are mapped, using normalized feature text plus owner context.
- [x] Keep each inference rule small, deterministic, and covered by focused tests.
- [x] Store provenance on generated effects with rule id, confidence, matched text, and condition context under `flags.monster-creator.fc5`.
- [ ] Preserve unsupported or risky matches in flags/report output instead of silently dropping them.
- [x] Deduplicate identical changes and keep generated effect ids deterministic.

High-confidence always-on rules to prioritize:

- [x] Unarmored AC formulas such as `AC equals 10 + Dexterity modifier + Constitution/Wisdom/Charisma modifier`.
- [x] Damage resistance, immunity, and vulnerability for specific damage types and `all damage types`.
- [x] Condition immunity for native dnd5e conditions.
- [x] Senses such as darkvision, blindsight, tremorsense, and truesight with exact distances.
- [x] Flat movement, AC, initiative, save, check, and attack/damage bonuses when wording is exact.

Conditional-effect policy:

- [x] Do not invent custom statuses for class states unless Foundry/dnd5e already has a native status or there is a clear workflow need.
- [x] `rage` / `raging` is not a native dnd5e status like `prone`, so Rage-derived benefits should be generated as disabled/toggleable Active Effects on the Rage feature.
- [x] Conditional phrases such as `while raging`, `while concentrating`, `against spells`, or `while not wearing armor` should not become blindly always-on bonuses unless the dnd5e system field itself handles the condition safely.
- [ ] Roll-context conditions that cannot be represented safely should be recorded as skipped inference candidates for later review.

Useful first implementation slice:

1. [x] Extract the current `buildFeaturePassiveEffects` logic into a rule runner.
2. [x] Add rules for specific/all damage resistance, immunity, vulnerability, and condition immunity.
3. [x] Add disabled/toggleable effect generation for exact runtime-conditional owner benefits, including Rage-style resistance wording.
4. [ ] Add a generation report that counts inferred, disabled, skipped, and unsupported candidates by rule.
5. [x] Add fixture tests plus real Complete Compendium spot checks for known generated item ids.

Current generation-wide coverage from `tmp/Complete_Compendium_5e.xml` after regeneration:

- 589 generated feature documents contain inferred Active Effects.
- 651 inferred Active Effects are generated.
- 318 inferred Active Effects are disabled runtime-condition toggles.
- `Tough as Nails` / `Compendium.monster-creator.fc5features.Item.9ll9eCqcJVQLTUmr` is covered by the shared rules `unarmored-defense-unarmoredBarb` and `damage-resistance`.

Next expansion candidates:

- Emit skipped inference candidates for risky roll-context phrases.
- Add a machine-readable generation report alongside pack generation.
- Add more exact rules for HP maximum bonuses, skill-specific bonuses, save-specific bonuses, and advantage/disadvantage only when dnd5e has a safe system field.
