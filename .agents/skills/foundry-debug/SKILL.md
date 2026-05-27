---
name: foundry-debug
description: Debug live Foundry VTT Monster Creator module issues in this repository. Use when Codex needs to launch Chrome through npm run dev, launch the Foundry world named by VTT_GAMEWORLD, log in to Foundry with .env credentials, reproduce bugs through the real Foundry world, attach to Chrome DevTools remote debugging, inspect console or network failures, verify module enablement, capture exact UI state, or fix behavior reached through the Actor Directory Create Monster flow.
---

# Foundry Debug

Use this skill to debug the module in a live Foundry VTT world before changing code. Treat the Vite harness as secondary unless the user says the issue is harness-only.

## Grounding

1. Read `AGENTS.md`, `.env.example`, `package.json`, and the files likely touched by the report.
2. Check `git status --short`; preserve unrelated user changes.
3. Read `.env` if needed for local-only values, but never print secrets. Use:
   - `VTT_URL`
   - `VTT_GAMEWORLD` (default: `test`)
   - `VTT_USER`
   - `VTT_PASSWORD`
   - `CHROME_DEBUG_PORT`
   - `CHROME_DEBUG_HOST`
   - `CHROME_DEBUG_ALLOW_ORIGINS`
   - `CHROME_DEBUG_USER_DATA_DIR`
   - `FOUNDRY_MONSTER_CREATOR_PATH`
4. If the problem touches dnd5e actor/item/compendium shapes, Foundry APIs, hooks, or module metadata, use `$dnd5e` too.

## Launch Chrome

1. Check whether a Chrome debug target is already active at `http://${CHROME_DEBUG_HOST:-127.0.0.1}:${CHROME_DEBUG_PORT:-9222}/json/list`.
2. If no target is active, run `npm run dev`. The launcher reads `.env`, opens `VTT_URL`, and prints:
   - CDP version URL.
   - CDP target list URL.
   - Allowed DevTools origins.
3. If browser-based CDP attach fails with WebSocket `403`, check `CHROME_DEBUG_ALLOW_ORIGINS`; it should include `http://localhost:${CHROME_DEBUG_PORT:-9222}` and `http://127.0.0.1:${CHROME_DEBUG_PORT:-9222}` for local tooling.
4. Keep remote debugging bound to `127.0.0.1` unless the user explicitly needs LAN attach. Treat `CHROME_DEBUG_HOST=0.0.0.0` as a trusted-network-only setting.

## Launch World And Login

1. Open `VTT_URL` in the debug Chrome page.
2. Determine target world as `VTT_GAMEWORLD || 'test'`.
3. If Foundry is on setup/world selection, launch the world whose id, title, or visible name matches the target world.
4. If no matching world is visible, report available world names and stop before changing settings.
5. If setup requires an admin password and no suitable env credential is already present, report the blocker and ask for the missing key; do not guess.
6. If Foundry shows the login screen after the world starts, select user `VTT_USER`.
7. Fill the password field with `VTT_PASSWORD` from `.env`; never print it in messages, logs, screenshots, or final answers.
8. Submit login and wait for `/game` plus the world UI.
9. If already logged in at `/game`, verify the active world matches `VTT_GAMEWORLD || 'test'` when Foundry exposes that value; otherwise note that it was already in-game.
10. If login fails, report only the failure mode and which env keys were present or missing, not credential values.

## Live Debug Flow

1. Attach to the `/game` page through Chrome DevTools Protocol or Playwright.
2. Confirm **Monster Creator** is enabled.
3. Reproduce through the real user path, usually Actor Directory -> **Create Monster**.
4. Capture evidence before edits:
   - Browser console errors and warnings.
   - Failed network requests and response bodies when useful.
   - Foundry notifications.
   - Exact module UI state, selected monster, search text, filters, page controls, and created actor data.
   - Minimal reproduction steps.

## Fix Workflow

- Prefer changes under `monster-creator/`; keep generated `dist/` out of manual edits.
- Keep UI changes aligned across scripts, templates, and styles.
- Prefer official Foundry docs and bundled Foundry frameworks before adding custom libraries.
- After edits, run focused tests first, then broader checks when risk justifies it.
- For live validation, run `npm run build` to copy the module into `FOUNDRY_MONSTER_CREATOR_PATH`, refresh the same Foundry browser, and repeat the reproduction.
- If an issue only appears in the Vite harness, use `npm run dev:vite` or `npm run dev:open` and say clearly that live Foundry was not the failing surface.

## Reporting

End with:

- Evidence observed.
- Root cause and changed files.
- Commands run.
- Live Foundry validation status, including any blocker.
