# Architecture Map

## Contents

- Current baseline
- Boot flow
- Runtime phases in `dnd5e.mjs`
- Repo map
- Start here by task
- Useful searches
- External references

## Current baseline

Observed on March 29, 2026:
- repo root branch: `5.3.x`
- `system.json` version: `5.3.0`
- Foundry compatibility: `13.347` minimum, `13` verified
- latest visible release on the repo page: `release-5.2.5` on January 20, 2026

Verify this again before any version-sensitive work.

## Boot flow

1. `system.json`
   - Declares the system manifest, document types, packs, pack folders, language packs, styles, and `dnd5e.mjs` as the ES module entrypoint.
2. `dnd5e.mjs`
   - Builds `game.dnd5e` and `CONFIG.DND5E`.
   - Registers document classes, sheet classes, dice, helpers, enrichers, and UI hooks.
3. `module/config.mjs`
   - Defines the static configuration used by `CONFIG.DND5E`.
4. `module/settings.mjs`
   - Registers keybindings, system settings, and deferred settings.
5. `module/module-registration.mjs`
   - Integrates module-provided source books or spell lists and customizes compendium packs.
6. `module/registry.mjs`
   - Initializes item registries and other cross-pack lookup helpers during startup.

## Runtime phases in `dnd5e.mjs`

- `init`
  - Set `game.dnd5e`
  - Set `CONFIG.DND5E`
  - Replace core document classes with dnd5e classes
  - Register sheet classes
  - Preload Handlebars helpers and templates
- `setup`
  - Expand trackable attributes
  - Apply deferred settings
  - Configure compendium packs
- `i18nInit`
  - Localize config, activity labels, and advancement labels
- `ready`
  - Initialize registries
  - Attach chat and sidebar behaviors
  - Run migrations

## Repo map

- `module/`
  - Runtime code. Start here for behavior changes.
- `templates/`
  - Handlebars templates used by sheets, chat cards, and apps.
- `less/`
  - Less source that compiles to `dnd5e.css`.
- `packs/_source/`
  - Authored compendium content. This is the editable source.
- `lang/`
  - Localization files.
- `json/`
  - Supporting data tables and migration mappings.
- `utils/`
  - Pack tooling and distribution scripts.
- `ui/`, `icons/`, `fonts/`, `tokens/`
  - Packaged media and assets.

## Start here by task

- Change manifest metadata, packs, or document types
  - `system.json`
- Change startup behavior or global registration
  - `dnd5e.mjs`
- Change enums, labels, activity types, advancement types, or shared config
  - `module/config.mjs`
- Change settings or keybindings
  - `module/settings.mjs`
- Change document logic
  - `module/documents/**`
- Change schema or system data shape
  - `module/data/**`
- Change sheets, dialogs, or UI apps
  - `module/applications/**`
- Change compendium browser or pack indexing behavior
  - `module/applications/compendium-browser.mjs`
  - `module/registry.mjs`
- Change authored content
  - `packs/_source/**`
  - `utils/packs.mjs`

## Useful searches

```bash
rg -n 'Hooks\\.(once|on)\\(' dnd5e.mjs module -g '*.mjs'
rg -n 'registerSheet|DocumentSheetConfig' dnd5e.mjs module -g '*.mjs'
rg -n 'build:db|build:json|build:source' package.json
rg --files module templates less packs/_source
```

## External references

- Repo root: <https://github.com/foundryvtt/dnd5e>
- Hooks wiki: <https://github.com/foundryvtt/dnd5e/wiki/Hooks>
- Foundry API V13: <https://foundryvtt.com/api/v13/index.html>
