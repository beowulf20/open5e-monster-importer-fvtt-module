---
name: dnd5e
description: Operate on the Foundry VTT dnd5e system repo and compatible modules or content. Use when Codex needs to inspect or modify foundryvtt/dnd5e, trace hooks or CONFIG.DND5E, change actor, item, or activity behavior, edit ApplicationV2 sheets, templates, or Less styles, work with compendium packs under packs/_source, or identify the exact upstream files and docs to consult.
---

# Foundry DnD5e

Use this skill to work inside or against the upstream `foundryvtt/dnd5e` system. Treat the bundled notes as a fast map, not immutable truth.

## Freshness Check

1. Confirm the current upstream branch on the repo root before acting on version-sensitive work.
2. Read `system.json` to confirm the current `version` and Foundry `compatibility`.
3. If the user asks for the latest or current behavior, verify the repo root, releases page, and relevant wiki page instead of trusting the bundled snapshot.

Observed upstream on March 29, 2026:
- repo root showed branch `5.3.x`
- `system.json` showed `version: 5.3.0`
- `system.json` showed Foundry compatibility `minimum: 13.347` and `verified: 13`
- GitHub repo page showed latest release `release-5.2.5` dated January 20, 2026

Use Foundry V13 docs for public API details:
- Repo root: <https://github.com/foundryvtt/dnd5e>
- Hooks wiki: <https://github.com/foundryvtt/dnd5e/wiki/Hooks>
- Activities wiki: <https://github.com/foundryvtt/dnd5e/wiki/Activities-Overview>
- Module Registration wiki: <https://github.com/foundryvtt/dnd5e/wiki/Module-Registration>
- Foundry API V13: <https://foundryvtt.com/api/v13/index.html>

## Quick Routing

- Boot or manifest work: `system.json`, `dnd5e.mjs`, `module/config.mjs`, `module/settings.mjs`, `module/module-registration.mjs`
- Document behavior: `module/documents/**`, then the matching schema in `module/data/**`
- Activity behavior: `module/documents/activity/**`, `module/data/activity/**`, `module/applications/activity/**`
- Sheets and UI: `module/applications/**`, `templates/**`, `less/**`
- Packs and authored content: `packs/_source/**`, `system.json`, `utils/packs.mjs`
- Compendium browser or registries: `module/applications/compendium-browser.mjs`, `module/registry.mjs`

## Reference Map

- Read `references/architecture.md` for boot flow, repo layout, and entrypoints.
- Read `references/api-map.md` for the document, data-model, activity, and ApplicationV2 layers.
- Read `references/hooks-and-extension-points.md` for high-value custom hooks and where they fire.
- Read `references/content-and-compendia.md` for pack authoring, pack metadata, and module registration.
- Read `references/task-recipes.md` for concrete task-to-file lookup examples.

## Search Patterns

Use fast repo searches before guessing:

```bash
rg -n 'Hooks\\.(call|callAll)\\("dnd5e\\.' dnd5e.mjs module -g '*.mjs'
rg -n 'Hooks\\.(once|on)\\(' dnd5e.mjs module -g '*.mjs'
rg -n 'activityTypes|advancementTypes|sourceBooks|SPELL_LISTS' system.json dnd5e.mjs module/config.mjs
rg -n 'prepareSheetContext|_preparePartContext|static PARTS|static TABS' module templates -g '*.mjs' -g '*.hbs'
rg --files packs/_source
```

## Rules

- Prefer public Foundry APIs and documented hooks over underscore-prefixed internals.
- Pair UI edits across code, Handlebars, and Less. Do not change only one layer.
- Treat `packs/_source` as the source of truth for authored compendium content.
- Re-check wiki or API docs before changing version-sensitive behavior such as hooks, applications, manifests, or packaging.
