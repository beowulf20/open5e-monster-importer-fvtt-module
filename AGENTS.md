# Repository Guidelines

## Project Structure & Module Organization

`monster-creator/` is the module root: `scripts/` runtime logic, `templates/` Handlebars views, `styles/` CSS, `assets/` static files, and `module.json` metadata. Tests live in `monster-creator/tests/` with fixtures in `monster-creator/tests/fixtures/`.

At the repo root, `README.md` covers usage and releases, `monster-creator-test.html` is the browser harness, `build-monster-creator.sh` creates `dist/`, and `vite.config.js` drives local development.

## Build, Test, and Development Commands

- `npm run dev`: launch Chrome with DevTools remote debugging and open `VTT_URL` from `.env`.
- `npm run dev:vite`: start the Vite dev server.
- `npm run dev:open`: start Vite and open the test page.
- `npm run serve`: preview the Vite build on port `4174`.
- `npm test`: run Jest for `monster-creator/tests/**/*.test.js`.
- `npm run test:watch`: rerun tests while developing.
- `FOUNDRY_MONSTER_CREATOR_PATH=/path/to/Data/modules/monster-creator npm run build`: copy the unpacked module into a Foundry modules directory.
- `./build-monster-creator.sh`: generate `dist/module.json` and the release zip files.

For local Foundry browser debugging, stay focused on the live Foundry page, not the Vite harness. Launch Chrome with DevTools remote debugging and open the VTT URL from `.env`:

```bash
npm run dev
```

Focused debug flow:

1. Read `VTT_URL`, `VTT_USER`, and `VTT_PASSWORD` from `.env`.
2. Attach to the Chrome remote debugging target at `http://127.0.0.1:9222/json/version` or the configured LAN debug endpoint.
3. Open `VTT_URL`, select `VTT_USER` on the Foundry login screen, submit `VTT_PASSWORD`, and wait for the world UI.
4. Confirm **Monster Creator** is enabled, then reproduce through the Actor Directory **Create Monster** button.
5. Capture browser console errors, failed network requests, Foundry notifications, and exact module UI state before changing code.
6. Prefer fixes under `monster-creator/`; use `npm run build` to copy into the local Foundry module path, then refresh the same debug page.

## Coding Style & Naming Conventions

Follow the existing JavaScript style: CommonJS modules, 2-space indentation, semicolons, and single quotes. Prefer `const` and small helpers. Use `camelCase` for functions and variables, `UPPER_SNAKE_CASE` for constants, and `kebab-case` for file names such as `statblock-formatter.js`.

Keep UI-facing changes aligned across `scripts/`, `templates/`, and `styles/`. Edit source files under `monster-creator/`; treat `dist/` as generated output.

## Testing Guidelines

Add coverage in `monster-creator/tests/` with file names ending in `.test.js`. Favor fixture-driven tests for Open5E payloads and assert payload shape, rendered output, defaults, and non-mutation behavior.

## Commit & Pull Request Guidelines

Commits follow Conventional Commits, as shown in history: `feat:`, `fix:`, and `chore:`. Keep subjects imperative and scoped to one change because semantic-release uses these prefixes on `main` and `master`.

PRs should include a short behavior summary, linked issue when applicable, and the commands you ran. Include screenshots for template or CSS updates and note any environment variables used, such as `MONSTER_CREATOR_BASE_URL` or `MONSTER_CREATOR_API_REMOTE_URL`.

## Foundry References

Prefer official Foundry docs before changing module metadata, hooks, or release packaging. This module targets Foundry `13`, so use the V13 docs unless `monster-creator/module.json` changes.

- Package registry: <https://foundryvtt.com/packages/>
  Use this to inspect package metadata, categories, compatibility badges, manifest links, download links, and version history.
- API documentation: <https://foundryvtt.com/api/>
  Use this for client-side classes, hooks, documents, applications, and method signatures. Prefer members marked public; avoid underscore-prefixed or private internals.
- Knowledge base: <https://foundryvtt.com/kb/>
  Use this for guidance on module structure, manifest fields, package management, versioning, and release workflows. Start here for packaging questions, then move to the API docs for implementation details.
