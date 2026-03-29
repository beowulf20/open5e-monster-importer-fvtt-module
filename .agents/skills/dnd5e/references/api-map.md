# API Map

## Contents

- Layering
- Document classes
- Actor data models
- Item data models
- Activity system
- Advancement system
- ApplicationV2 surface
- Registries and compendium-facing APIs
- Useful searches

## Layering

- `module/config.mjs`
  - Static configuration used to build `CONFIG.DND5E`.
- `module/data/**`
  - Data models and shared fields. Change schema and derived system data here.
- `module/documents/**`
  - Document classes and game logic. Change lifecycle behavior here.
- `module/applications/**`
  - ApplicationV2 sheets, dialogs, and UI composition. Change rendering and interaction here.

## Document classes

Read `module/documents/_module.mjs` first to see the exported surface:
- `Actor5e` -> `module/documents/actor/actor.mjs`
- `Item5e` -> `module/documents/item.mjs`
- `ActiveEffect5e` -> `module/documents/active-effect.mjs`
- `ChatMessage5e` -> `module/documents/chat-message.mjs`
- `TokenDocument5e` -> `module/documents/token.mjs`
- Activity documents -> `module/documents/activity/**`
- Advancement documents -> `module/documents/advancement/**`

Use documents for:
- getters and computed behavior
- roll and usage workflows
- concentration, rest, transformation, damage, or chat behavior
- hooks that intercept runtime actions

## Actor data models

Read `module/data/actor/_module.mjs` for the actor type map:
- `character`
- `encounter`
- `group`
- `npc`
- `vehicle`

Important supporting actor paths:
- `module/data/actor/templates/**`
- `module/data/actor/fields/**`
- `module/documents/actor/actor.mjs`
- `module/applications/actor/api/base-actor-sheet.mjs`
- `module/applications/actor/*.mjs`

## Item data models

Read `module/data/item/_module.mjs` for the item type map:
- `background`
- `class`
- `consumable`
- `container`
- `equipment`
- `facility`
- `feat`
- `loot`
- `race`
- `spell`
- `subclass`
- `tool`
- `weapon`

Important supporting item paths:
- `module/data/item/templates/**`
- `module/documents/item.mjs`
- `module/applications/item/item-sheet.mjs`
- `module/applications/item/container-sheet.mjs`

## Activity system

Use the activity system when the task involves attacks, damage, saves, summons, enchantments, or utility actions.

Read in this order:
1. `module/config.mjs`
   - `DND5E.activityTypes`
2. `module/data/activity/_module.mjs`
   - base and per-type data models
3. `module/documents/activity/mixin.mjs`
   - shared usage and consumption flow
4. `module/documents/activity/<type>.mjs`
   - per-type runtime behavior
5. `module/applications/activity/<type>-sheet.mjs`
   - per-type sheet and dialog UI

Main activity types currently configured:
- `attack`
- `cast`
- `check`
- `damage`
- `enchant`
- `forward`
- `heal`
- `order`
- `save`
- `summon`
- `transform`
- `utility`

## Advancement system

Read in this order:
1. `module/config.mjs`
   - `DND5E.advancementTypes`
2. `module/data/advancement/**`
3. `module/documents/advancement/**`
4. `module/applications/advancement/**`

This is the correct path for class, species, feat, or background advancement behavior.

## ApplicationV2 surface

Core entrypoints:
- `module/applications/api/document-sheet.mjs`
- `module/applications/api/primary-sheet-mixin.mjs`
- `module/applications/actor/api/base-actor-sheet.mjs`

Sheet composition patterns to inspect:
- `static PARTS`
- `static TABS`
- `_prepareContext`
- `_preparePartContext`
- `dnd5e.prepareSheetContext` hook in `primary-sheet-mixin.mjs`

Good concrete sheet examples:
- `module/applications/actor/character-sheet.mjs`
- `module/applications/actor/npc-sheet.mjs`
- `module/applications/item/item-sheet.mjs`

## Registries and compendium-facing APIs

- `module/registry.mjs`
  - Compendium-driven item registries and dependent lookups.
- `module/applications/compendium-browser.mjs`
  - Compendium browser UI, filters, and selection behavior.
- `module/module-registration.mjs`
  - Module-provided source books, spell lists, redirects, and pack customization.

## Useful searches

```bash
rg -n 'activityTypes|advancementTypes|sourceBooks|SPELL_LISTS' system.json dnd5e.mjs module/config.mjs
rg -n 'export .*config =|export \\* as' module/data module/documents module/applications -g '*_module.mjs' -g '*.mjs'
rg -n 'static PARTS|static TABS|_prepareContext|_preparePartContext' module/applications -g '*.mjs'
```
