# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WebHotkeys — a small, dependency-free vanilla JS library for binding keyboard shortcuts on a webpage, either declaratively via `[data-hotkey]` attributes or programmatically via `window.webHotkeys.grab(...)`. Distributed two ways from the exact same file: as a classic `<script>` tag loaded from a CDN (jsDelivr pointing at this GitHub repo, with `window.webHotkeys` auto-registered via the `?register` query param), and as the `webhotkeys` npm package (`require`/`import`, no auto-registration - the consumer calls `new WebHotkeys()` itself).

## Repository layout

The entire library is `WebHotkeys.js` — a single self-contained file with no runtime dependencies. The only build step is minification (esbuild, a devDependency); there is no bundler and no linter. Everything else is documentation/support:

- `WebHotkeys.js` — the whole library (classes `WebHotkeys`, `Hotkey`, `HotkeyGroup`, `_List`). The bottom of the file has two guarded blocks: one auto-registers `window.webHotkeys` when loaded as `<script src="...?register">`, the other sets `module.exports` when loaded under CommonJS/a bundler. Both are `typeof`-guarded so neither path affects the other - keep it that way when editing that section.
- `WebHotkeys.min.js` — **generated, but committed.** jsDelivr serves files straight out of a git tag, so the artifact has to be in the repo. Never edit it; run `npm run build`. It must be regenerated whenever `WebHotkeys.js` changes, otherwise CI fails.
- `scripts/build.js` — the whole build: esbuild minification plus stamping the version and the SRI hash into README.md. Read the comment about `bundle: true` before touching it (bundling would rename the global `WebHotkeys` class and break every `<script>` consumer).
- `WebHotkeys.mjs` — three-line ESM re-export wrapper for the npm `exports` map (`import` resolves here, `require` to `WebHotkeys.js`). Keep its named exports in sync with the `module.exports` block.
- `index.d.ts` — hand-written TypeScript definitions (there is no TS source to generate them from); update alongside any public API change.
- `package.json` — npm packaging metadata only (`main`/`module`/`types` + `exports`); there's no build output, the published files are the source files. `npm test` runs every test file.
- `example.html` — live usage demo, also published as GitHub Pages at the URL in README.md.
- `README.md` — the API reference; keep it in sync with `WebHotkeys.js` when changing public behavior (parameter names, options, method semantics).
- `CHANGELOG.md` — one entry per released version, newest first; update when bumping the version.
- `test/*.test.js` — plain Node scripts (no framework, no dependencies). `WebHotkeys.js` is a browser script with no `module.exports`, so each test file loads it into a `vm` context with a minimal `document`/`HTMLElement`/`MutationObserver` stub. Run them all with `npm test`, or a single one with `node test/<name>.test.js`. `npm run test:min` runs the same suite against `WebHotkeys.min.js` (via the `WH_FILE` env var) — that is the only guard against the minifier breaking something, so keep new tests loading the file through `WH_FILE`. `test/esm-import.test.mjs` covers the ESM entry point and needs no stub.
- `ARTICLE.md` — draft material for a blog post: copyable examples plus a feature comparison against @github/hotkey, tinykeys, Mousetrap, hotkeys-js and react-hotkeys-hook. Not documentation; the competitor numbers are a snapshot and need re-checking before publishing.
- `plan.md` — the npm/GitHub migration checklist plus the feature brainstorm. Untracked scratch.
- `_untracked` — scratch notes about the original "shadow shortcut" idea. Superseded: the numpad/`Return` aliasing now lives in `CODE_ALIASES`/`KEY_ALIASES` and is resolved in `_candidates`.

For anything not covered by the Node tests (rendering, real `KeyboardEvent`s, DOM mutation timing), verify manually by opening `example.html` in a browser and exercising the shortcuts.

## Versioning

Releasing is one command: `npm version <patch|minor|major>` followed by `git push --follow-tags`.

`npm version` runs the `version` script, which rebuilds `WebHotkeys.min.js`, stamps the new version tag *and* the new SRI hash into README.md, runs the suite against the minified build and stages everything — so the CDN snippet in README can never disagree with what jsDelivr serves. Tags stay bare (`0.10.0`, no `v`) because the jsDelivr URLs resolve them directly; `.npmrc` enforces that. Pushing the tag triggers `.github/workflows/release.yml`, which publishes to npm via Trusted Publishing (OIDC, no token). Write the `CHANGELOG.md` entry by hand before bumping.

## Architecture

Everything lives in `WebHotkeys.js` as four cooperating pieces:

- **`WebHotkeys`** — the entry point (`window.webHotkeys` when loaded with `?register`). Owns `_hotkeys` (a map keyed by a `KeyState` string — see below — to an array of `Hotkey`s, most-recently-grabbed first), `_dom` (a `WeakMap` linking DOM elements to their `Hotkey`), and `_groups`. Sets up one `keydown` listener and one `MutationObserver` for the whole page.
- **`Hotkey`** — one bound shortcut. Can be tied to a DOM element (via `[data-hotkey]` or passing an element/selector as the action) or to a plain callback. Elements get their hint text appended to `title`/innerText/label on construction, guarded by a `data-webhotkeys-displayed` marker so re-hinting is idempotent across clones.
- **`HotkeyGroup`** — an `Array<Hotkey>` with `enable`/`disable`/`toggle` that fan out to every member. Populated either explicitly via `wh.group(name, definitions)` or implicitly from `[data-hotkey-group]` ancestors.
- **`_List`** — the `wh.list(...)` helper for arrow-key navigation over a set of DOM nodes (e.g. menu items), independent of the hotkey registry itself.

Key mechanics worth understanding before touching `_trigger`, `grab`, or `Hotkey.disable`:

- **Dual keying.** A hotkey is resolved by *either* `event.code` (layout-independent, e.g. `KeyF`, `Digit1`) *or* `event.key` (layout-dependent, e.g. `f`, `1`, `?`). `_parseHotkey` picks `code` vs `key` based on string length (`key.length === 1` → treat as `key`, e.g. `"f"`; otherwise → treat as `code`, e.g. `"KeyF"`). `code` and `key` live in separate storage slots and `_trigger` checks both, `code` first.
- **`KeyState` collisions.** The registry key is `(event.key || event.code) + modifierBits`. Multiple unrelated `Hotkey`s can legitimately share one `KeyState` slot's array (e.g. two different hotkeys both landing under the same code+modifier bucket, or a hotkey and a later-disabled one). `Hotkey.disable()` therefore looks up its own index via `indexOf` and splices *that* index — never assume the last item in the array belongs to `this` (see the fix in commit `8217876`: a bare `splice(-1, 1)` on an already-disabled hotkey removed a *different* hotkey sharing the combination).
- **Conflict resolution order.** Within one `KeyState` bucket, the most recently `grab()`-bound (or most recently `enable()`-d) hotkey is tried first (`unshift`, not `push`). `_trigger` walks the bucket and keeps going to the next candidate if `scope` doesn't match or the action explicitly returns `false`.
- **Text-input guarding.** `_trigger` bails out early for plain letter keys, text-navigation keys (arrows/Home/End/Delete/Backspace), and Enter/Tab, when focus is inside a form field or `contenteditable` — so hotkeys don't fight normal text editing. `Ctrl`/`Alt`/`Meta` combos and non-text keys (`F1`, etc.) bypass this guard.
- **Sequences.** A hotkey is a *list* of parsed combinations (`hotkey.sequence`); a plain one has a single item. It is registered in the registry under its **last** combination, and `_trigger` verifies the preceding ones against `_buffer` (recent keystrokes + timestamps). `_candidates` sorts longer sequences first, so `g i` beats a plain `i`. When nothing matched but the buffer is a prefix of some sequence, the key is swallowed and we wait; otherwise the buffer is cleared.
- **Live DOM sync.** With `observe: true`, a single page-wide `MutationObserver` grabs/ungrabs hotkeys as `[data-hotkey]` elements (or their `[data-hotkey-group]` ancestors) are added, removed, or have the attribute mutated — this is what lets `data-hotkey` be added/removed dynamically without calling `grab`/`disable` manually.
