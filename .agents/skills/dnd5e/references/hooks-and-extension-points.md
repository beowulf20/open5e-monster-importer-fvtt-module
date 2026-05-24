# Hooks And Extension Points

## Contents

- Boot and UI hooks
- Actor and item hooks
- Activity hooks
- Combat and recharge hooks
- Render and helper hooks
- Foundry lifecycle hooks wired in `dnd5e.mjs`

Use this file as a shortlist. For the full set, search the repo:

```bash
rg -n 'Hooks\\.(call|callAll)\\("dnd5e\\.' dnd5e.mjs module -g '*.mjs'
```

## Boot and UI hooks

- `dnd5e.setupCalendar`
  - File: `dnd5e.mjs`
  - Use to customize calendar setup before the system finishes calendar registration.
  - Return `false` to stop the default setup.
- `dnd5e.prepareSheetContext`
  - File: `module/applications/api/primary-sheet-mixin.mjs`
  - Use to adjust part context before a sheet part renders.
  - Does not cancel rendering by return value.
- `dnd5e.dropItemSheetData`
  - Files: `module/applications/item/item-sheet.mjs`, `module/applications/item/container-sheet.mjs`
  - Use to validate or block item-drop behavior on item sheets.
  - Return `false` to block the drop.
- `dnd5e.filterItem`
  - Files: `module/applications/actor/api/base-actor-sheet.mjs`, `module/applications/item/container-sheet.mjs`
  - Use to override inventory or sheet filtering.
  - Return `false` to exclude the item.
- `dnd5e.compendiumBrowserSelection`
  - File: `module/applications/compendium-browser.mjs`
  - Fires when the browser selection changes.

## Actor and item hooks

- `dnd5e.initializeActorSource`
  - File: `module/documents/actor/actor.mjs`
  - Use to rewrite compendium actor source before initialization.
- `dnd5e.initializeItemSource`
  - File: `module/documents/item.mjs`
  - Use to rewrite compendium item source before initialization.
- `dnd5e.preApplyDamage`
  - File: `module/documents/actor/actor.mjs`
  - Use to intercept final damage application.
  - Return `false` to stop the apply step.
- `dnd5e.applyDamage`
  - File: `module/documents/actor/actor.mjs`
  - Fires after damage is applied.
- `dnd5e.preCalculateDamage`
  - File: `module/documents/actor/actor.mjs`
  - Use to intercept damage calculation.
  - Return `false` to stop the calculation.
- `dnd5e.calculateDamage`
  - File: `module/documents/actor/actor.mjs`
  - Fires during or after calculation depending on the workflow branch.
- `dnd5e.preDisplayCard`
  - File: `module/documents/item.mjs`
  - Use to intercept item chat-card display.
  - Return `false` to stop card creation.
- `dnd5e.createScrollFromSpell`
  - File: `module/documents/item.mjs`
  - Fires after spell-scroll data is produced.

## Activity hooks

- `dnd5e.preUseActivity`
  - File: `module/documents/activity/mixin.mjs`
  - Use to intercept activity usage before dialog and message creation.
  - Return `false` to stop usage.
- `dnd5e.postUseActivity`
  - File: `module/documents/activity/mixin.mjs`
  - Use to inspect or post-process usage results.
  - Returning `false` stops later continuation in that branch.
- `dnd5e.preActivityConsumption`
  - File: `module/documents/activity/mixin.mjs`
  - Return `false` to block consumption.
- `dnd5e.activityConsumption`
  - File: `module/documents/activity/mixin.mjs`
  - Fires while building consumption updates.
  - Return `false` to stop the update branch.
- `dnd5e.postActivityConsumption`
  - File: `module/documents/activity/mixin.mjs`
  - Fires after consumption updates are prepared.
  - Return `false` to stop later continuation in that branch.
- `dnd5e.preCreateUsageMessage`
  - File: `module/documents/activity/mixin.mjs`
  - Use to rewrite usage message config before chat message creation.
- `dnd5e.postCreateUsageMessage`
  - File: `module/documents/activity/mixin.mjs`
  - Fires after the usage card is created.
- `dnd5e.rollAttack`
  - File: `module/documents/activity/attack.mjs`
  - Fires after attack rolls are built.
- `dnd5e.postRollAttack`
  - File: `module/documents/activity/attack.mjs`
  - Fires after attack-roll post-processing.
- `dnd5e.rollDamage`
  - File: `module/documents/activity/mixin.mjs`
  - Fires after damage rolls are built.
- `dnd5e.preSummon`
  - File: `module/documents/activity/summon.mjs`
  - Return `false` to stop summon creation.
- `dnd5e.preSummonToken`
  - File: `module/documents/activity/summon.mjs`
  - Return `false` to skip an individual token.
- `dnd5e.summonToken`
  - File: `module/documents/activity/summon.mjs`
  - Fires after a summon token is created.
- `dnd5e.preApplyEnchantment`
  - File: `module/documents/activity/enchant.mjs`
  - Return `false` to stop enchantment application.
- `dnd5e.applyEnchantment`
  - File: `module/documents/activity/enchant.mjs`
  - Fires after the enchantment effect is created.

## Combat and recharge hooks

- `dnd5e.preCreateCombatMessage`
  - File: `module/documents/combatant.mjs`
- `dnd5e.preCombatRecovery`
  - File: `module/documents/combatant.mjs`
  - Return `false` to stop recovery.
- `dnd5e.combatRecovery`
  - File: `module/documents/combatant.mjs`
  - Return `false` to stop later continuation.
- `dnd5e.postCombatRecovery`
  - File: `module/documents/combatant.mjs`
- `dnd5e.rollRecharge`
  - File: `module/data/shared/uses-field.mjs`
  - Return `false` to stop recharge application.
- `dnd5e.postRollRecharge`
  - File: `module/data/shared/uses-field.mjs`

## Render and helper hooks

- `dnd5e.renderChatMessage`
  - File: `module/documents/chat-message.mjs`
- `dnd5e.getItemAdvancementContext`
  - File: `module/documents/advancement/advancement.mjs`
- `dnd5e.getItemActivityContext`
  - File: `module/documents/activity/mixin.mjs`
- `dnd5e.getUnknownAttributeLabel`
  - File: `module/utils.mjs`
- `dnd5e.renderNPCStatBlock`
  - File: `module/data/actor/npc.mjs`
- `dnd5e.renderEmbeddedSpell`
  - File: `module/data/item/spell.mjs`

## Foundry lifecycle hooks wired in `dnd5e.mjs`

Use these when you need system-wide timing rather than custom dnd5e hooks:
- `init`
- `setup`
- `i18nInit`
- `ready`
- `renderChatLog`
- `getActorContextOptions`
- `getItemContextOptions`
- `renderCompendiumDirectory`
- `renderCombatTracker`
- `updateWorldTime`
