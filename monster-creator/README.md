# Monster Creator

A Foundry VTT module starter that adds a `Create Monster` button to the Actor Directory and opens a form for creating NPC-style monster actors.

## Install for development

1. Copy this folder to your Foundry `Data/modules/` directory.
2. In Foundry, enable **Monster Creator** from Module Management.
3. Reload the world.
4. Open the Actors sidebar tab.
5. Click **Create Monster** in the directory footer/header actions.
6. Use the **Open5E Search** section in the form for query + pagination.

## Files

- `module.json` - module metadata
- `scripts/monster-creator.js` - module behavior and form
- `templates/monster-creator-form.hbs` - form UI
- `styles/monster-creator.css` - UI styling

## Notes

- The current actor payload is a good DnD5e-oriented base and can be customized in `scripts/monster-creator.js` for your target system.

## Build

From repository root:

```bash
./build-monster-creator.sh
```

This creates:

- `dist/monster-creator-v<version>.zip`
- `dist/module.json` (generated for local/static hosting)
- `dist/monster-creator/` (copy of module files used by the generated manifest)
  (where `<version>` is the `version` field in `monster-creator/module.json`).

To host locally for install testing:

```bash
MONSTER_CREATOR_BASE_URL=http://127.0.0.1:8000 ./build-monster-creator.sh
cd dist
python3 -m http.server 8000
```

To point the module at a custom Open5E API endpoint when building, set:

```bash
MONSTER_CREATOR_API_REMOTE_URL=http://localhost:8888 ./build-monster-creator.sh
```

If unset, the API URL defaults to `http://localhost:8888`.

In Foundry, use:

`http://127.0.0.1:8000/module.json`

## Local test server (Vite)

Start a lightweight testable server:

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:4173/monster-creator-test.html`

The page:

- loads local fixtures from `monster-creator/tests/fixtures/open5e-monsters.fixture.json`
- builds actor payloads using the formatter
- optionally pulls live Open5E search results through local proxy route `/open5e/*`
