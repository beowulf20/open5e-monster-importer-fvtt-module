# Monster Creator

Monster Creator is a full Foundry Virtual Tabletop module that adds a **Create Monster** button to the Actor Directory and opens a Foundry form for creating NPC-style monsters with embedded Open5E search.

It is built as a self-contained Foundry module for import via a manifest URL:

- module metadata: `module.json`
- runtime script: `scripts/monster-creator.js`
- form template: `templates/monster-creator-form.hbs`
- module styles: `styles/monster-creator.css`
- local FC5 pack generator: `tools/fc5-compendium/generate-fc5-compendiums.js`

## What this module provides

- Actor Directory button: **Create Monster**
- Embedded Open5E monster search and pagination with local BM25 ranking
- NPC actor creation payload that follows DnD5e conventions
- Local/private Fight Club 5e XML conversion into `dnd5e` compendium packs
- Automatic manifest/download URL injection for distribution builds

## Installation

### From a built release

1. In Foundry VTT, open **Module Management**.
2. Use **Install Module** and provide the release manifest URL.
3. Enable **Monster Creator** in your world.
4. Open the Actors tab and use **Create Monster**.

#### Install walkthrough

![Install step 1](assets/how-install/image1.png)

![Install step 2](assets/how-install/image2.png)

Use the module manifest URL from the repository’s **Releases** page: `https://github.com/beowulf20/open5e-monster-importer-fvtt-module/releases/latest/download/module.json`.

![Install step 3](assets/how-install/image3.png)

### Manual install for local testing

From repository root:

```bash
npm install
npm run dev:vite
```

Then visit the local test page:

- `http://localhost:4173/monster-creator-test.html`

For local Foundry installs, copy `.env.example` to `.env` and set:

```bash
FOUNDRY_MONSTER_CREATOR_PATH=/path/to/FoundryVTT/Data/modules/monster-creator
VTT_URL=http://192.168.68.100:30000
VTT_USER=Gamemaster
VTT_PASSWORD=your-foundry-password
```

Then run:

```bash
npm run build
```

To launch Foundry in a Chrome instance that can be attached to with DevTools remote debugging:

```bash
npm run dev
```

Keep port `9222` on a trusted network only because it allows browser control.

For login automation, use `VTT_USER` and `VTT_PASSWORD` from `.env` to select the Foundry user and submit the password.

## Usage

1. Open Foundry and enable the module.
2. In Actor Directory, click **Create Monster**.
3. Use the form search + page controls to find a monster.
4. Review and submit to create the actor.

## FC5 Compendium Generation

This repo can also generate local/private `dnd5e` compendium packs from a Fight Club 5e XML file. The generated pack data is ignored by git and intended for local use only.

Target release used for development:

- `https://github.com/vidalvanbergen/FightClub5eXML/releases/download/nightly/Complete_Compendium_5e.xml`

Install dependencies and generate packs:

```bash
npm install
npm run generate:fc5-compendia
```

By default, the generator reads `tmp/Complete_Compendium_5e.xml`. You can override that with `--xml` or by setting `FC5_XML_PATH` in `.env`:

```bash
npm run generate:fc5-compendia -- --xml /path/to/Complete_Compendium_5e.xml
```

That command writes JSON source files under `tmp/fc5-pack-sources/` and compiles module pack data into:

- `monster-creator/packs/fc5-spells`
- `monster-creator/packs/fc5-items`
- `monster-creator/packs/fc5-classes`
- `monster-creator/packs/fc5-subclasses`
- `monster-creator/packs/fc5-features`

Generated documents include mapped Active Effects for common FC5 modifier data such as AC bonuses, weapon/spell attack bonuses, damage bonuses, save bonuses, movement bonuses, ability score bonuses, and subclass/class feature modifiers. Class and subclass feature prose also gets high-confidence passive effect inference for owner-scoped traits such as damage resistance, damage immunity, condition immunity, senses, movement bonuses, flat bonuses, and unarmored AC formulas; runtime-conditional matches are generated disabled for manual toggling. Unsupported modifier strings are preserved in document flags for later refinement instead of being dropped.

The module manifest already includes these pack definitions. Regenerate them locally whenever the upstream XML changes.

### FC5 icon curation

After generating FC5 pack sources, run the local icon operator panel:

```bash
npm run icons:dev
```

Open `/fc5-icon-tool.html` if the browser does not open automatically. The panel shows generated FC5 items still using generic icons, accepts pasted/dropped images or image URLs, stores approved assets under `monster-creator/assets/fc5-icons/`, and records decisions in `tools/fc5-compendium/icon-overrides.json`. Run `npm run generate:fc5-compendia` again to apply approved icons to the compiled packs.

## Screenshots

![Monster Creator Screenshot 1](assets/image1.png)

![Monster Creator Screenshot 2](assets/image2.png)

![Monster Creator Screenshot 3](assets/image3.png)

![Monster Creator Screenshot 4](assets/image4.png)

## Build and release artifacts

Run the full build from repo root:

```bash
./build-monster-creator.sh
```

Build outputs:

- `dist/monster-creator-v<version>.zip`
- `dist/monster-creator.zip` (release-ready filename)
- `dist/module.json`
- `dist/monster-creator/`

You can host locally to test module install flow:

```bash
MONSTER_CREATOR_BASE_URL=http://127.0.0.1:8000 ./build-monster-creator.sh
cd dist
python3 -m http.server 8000
```

Then in Foundry use:

- `http://127.0.0.1:8000/module.json`

### Open5E data

Monster Creator embeds the Open5E creature payload in the module and searches it locally with BM25 ranking plus local query expansion. Runtime search does not need the Open5E API by default.

Refresh the embedded creature data with:

```bash
npm run generate:open5e-data
```

For local/proxy debugging, switch **Open5E data source** to **Remote Open5E API** in module settings. The default API endpoint is `https://api.open5e.com`. To override the endpoint during release builds:

```bash
MONSTER_CREATOR_API_REMOTE_URL=http://localhost:8888 ./build-monster-creator.sh
```

`./build-monster-creator.sh` also reads these values from `.env`.

## Release tooling

A semantic-release workflow is configured in this repo for release automation. The dry-run command is:

```bash
npm run release:dry-run
```

Release preparation updates both `dist/module.json` and `dist/monster-creator/module.json` so Foundry can install the module with `monster-creator.zip` from the release.

## Credits

- Most of the module work is based on and inspired by [Aioros/5e-statblock-importer](https://github.com/Aioros/5e-statblock-importer).
