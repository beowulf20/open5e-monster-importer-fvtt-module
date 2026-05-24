# Task Recipes

## Add or change a character sheet tab

Read in this order:
1. `module/applications/actor/api/base-actor-sheet.mjs`
2. `module/applications/actor/character-sheet.mjs`
3. matching templates under `templates/actors/**` and `templates/inventory/**`
4. matching styles under `less/**`, especially `less/v2/character.less` and shared blocks

Focus on:
- `static PARTS`
- `static TABS`
- `_prepareContext`
- `_preparePartContext`

## Change the base item sheet or container sheet

Read in this order:
1. `module/applications/item/item-sheet.mjs`
2. `module/applications/item/container-sheet.mjs`
3. matching templates under `templates/items/**`
4. matching shared templates under `templates/shared/**` or `templates/inventory/**`
5. relevant data templates under `module/data/item/templates/**`

Use this route for:
- new tabs or fields
- item effect or activity UI
- description or identification behavior

## Change an activity type

Read in this order:
1. `module/config.mjs`
   - find the type in `DND5E.activityTypes`
2. `module/data/activity/<type>-data.mjs`
3. `module/documents/activity/<type>.mjs`
4. `module/applications/activity/<type>-sheet.mjs`
5. `module/documents/activity/mixin.mjs`
6. related chat or template files under `templates/activity/**` and `templates/chat/**`

Use this route for:
- attack formulas
- damage or save behavior
- summon, enchant, transform, or utility workflows
- activity consumption changes

## Change actor or item system data

Actor route:
1. `module/data/actor/_module.mjs`
2. `module/data/actor/<type>.mjs`
3. `module/data/actor/templates/**`
4. `module/documents/actor/actor.mjs`
5. the relevant actor sheet under `module/applications/actor/**`

Item route:
1. `module/data/item/_module.mjs`
2. `module/data/item/<type>.mjs`
3. `module/data/item/templates/**`
4. `module/documents/item.mjs`
5. the relevant item sheet under `module/applications/item/**`

## Add or edit compendium content

Read in this order:
1. `system.json`
2. the relevant pack under `packs/_source/**`
3. `utils/packs.mjs`
4. `package.json`

Workflow:
- edit the authored YAML or JSON in `packs/_source`
- update pack metadata in `system.json` if the pack definition changes
- rebuild packed output with the pack tooling

## Register source books or spell lists from another module

Read in this order:
1. external manifest flags
2. `module/module-registration.mjs`
3. `module/registry.mjs`

Focus on:
- `flags.dnd5e.sourceBooks`
- `flags.dnd5e.spellLists`
- pack redirects and pack display behavior

## Find the right hook or extension point

Run:

```bash
rg -n 'Hooks\\.(call|callAll)\\("dnd5e\\.' dnd5e.mjs module -g '*.mjs'
rg -n '@function dnd5e\\.' dnd5e.mjs module -g '*.mjs'
```

Then cross-check the results with `references/hooks-and-extension-points.md`.
