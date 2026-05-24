# Content And Compendia

## Source of truth

Treat `packs/_source/**` as the editable source of truth. Do not hand-edit packed DB output when the YAML or JSON source exists under `_source`.

Common authored content examples:
- `packs/_source/spells/**`
- `packs/_source/content24/**`
- `packs/_source/actors24/**`

Look for `_folder.yml` alongside content files to understand folder structure and ordering.

## Manifest metadata

Read `system.json` for:
- `documentTypes`
- `packs`
- `packFolders`
- language packs
- hot reload paths
- manifest-level `flags.dnd5e.sourceBooks`

Use `system.json` when the task involves:
- adding or renaming a pack
- changing pack labels or flags
- checking which item or actor types live in a pack
- understanding which source book a pack belongs to

## Pack build and unpack flow

Read `package.json` and `utils/packs.mjs`.

Important scripts:
- `npm run build:db`
  - `node ./utils/packs.mjs package pack`
- `npm run build:json`
  - `node ./utils/packs.mjs package unpack`
- `npm run build:source`
  - same unpack flow

Use these when:
- rebuilding packed compendia after editing `_source`
- unpacking a packed compendium to inspect its authored form
- checking how pack metadata gets transformed

## Module registration and external integration

Read `module/module-registration.mjs` when a module or world needs to extend dnd5e content behavior.

Key behaviors:
- `registerModuleData()`
  - merges manifest-provided `flags.dnd5e.sourceBooks`
  - registers manifest-provided `flags.dnd5e.spellLists`
- `setupModulePacks()`
  - changes pack application classes and sorting
- `registerModuleRedirects()`
  - redirects premium pack UUIDs to SRD packs when premium modules are not active

If a task says "register a source book" or "register a spell list", inspect:
- the external manifest flags
- `module/module-registration.mjs`
- `module/registry.mjs`

## Where to look by content task

- Add or change authored spell content
  - `packs/_source/spells/**`
- Add or change modern SRD journal content
  - `packs/_source/content24/**`
- Add or change modern SRD actors
  - `packs/_source/actors24/**`
- Change how packs appear in the UI
  - `system.json`
  - `module/module-registration.mjs`
  - `module/applications/journal/table-of-contents.mjs`
  - `module/applications/item/item-compendium.mjs`
- Change compendium browser indexing or lookups
  - `module/applications/compendium-browser.mjs`
  - `module/registry.mjs`

## Useful searches

```bash
rg -n 'packFolders|sourceBooks|flags\\.dnd5e|documentTypes' system.json
rg --files packs/_source
rg -n 'registerModuleData|registerSourceBooks|registerSpellLists|setupModulePacks|registerModuleRedirects' module/module-registration.mjs
rg -n 'build:db|build:json|build:source' package.json
```

## External references

- Repo root: <https://github.com/foundryvtt/dnd5e>
- Module Registration wiki: <https://github.com/foundryvtt/dnd5e/wiki/Module-Registration>
