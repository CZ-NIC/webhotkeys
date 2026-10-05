# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WebHotkeys — a small, dependency-free vanilla JS library for binding keyboard shortcuts on a webpage, either declaratively via `[data-hotkey]` attributes or programmatically via `window.webHotkeys.grab(...)`. Distributed two ways from the exact same file: as a classic `<script>` tag loaded from jsDelivr (which serves the npm tarball; `window.webHotkeys` is auto-registered by the `data-register` attribute on the script tag), and as the `webhotkeys` npm package (`require`/`import`, no auto-registration - the consumer calls `new WebHotkeys()` itself).

## Repository layout

The entire library is `src/WebHotkeys.js` — a single self-contained file with no runtime dependencies. The only build step is minification (esbuild, pinned devDependency); there is no bundler. `npm run lint` runs eslint (`eslint.config.js`). The `Makefile` is just thin aliases over the npm scripts (`make help`). Everything else is documentation/support:

- `src/WebHotkeys.js` — the whole library (classes `WebHotkeys`, `Hotkey`, `HotkeyGroup`, `_List`, `_Grid`). The bottom of the file has two guarded blocks: one auto-registers `window.webHotkeys` when loaded as `<script src="..." data-register>`, the other sets `module.exports` when loaded under CommonJS/a bundler. Both are `typeof`-guarded so neither path affects the other - keep it that way when editing that section.
- `dist/WebHotkeys.min.js` — **generated, gitignored.** `prepack` builds it into the npm tarball, which is what jsDelivr serves. Never edit it; run `npm run build`. Only its SRI hash is committed (in README.md); esbuild is pinned exactly, so the output is byte-reproducible. CI checks the README hash against a rebuild only on a release tag - between releases README.md still describes the last released version while `src/` moves on, so never rebuild-and-commit README.md just to update the hash.
- `scripts/build.js` — esbuild minification plus stamping the version and the SRI hash into README.md. Read the comment about `bundle: true` before touching it (bundling would rename the global `WebHotkeys` class and break every `<script>` consumer).
- `scripts/release.js`, `scripts/stamp-changelog.js` — the release, see Versioning.
- `src/WebHotkeys.mjs` — three-line ESM re-export wrapper for the npm `exports` map (`import` resolves here, `require` to `src/WebHotkeys.js`). Keep its named exports in sync with the `module.exports` block.
- `src/index.d.ts` — hand-written TypeScript definitions (there is no TS source to generate them from); update alongside any public API change.
- `package.json` — npm metadata (`main`/`module`/`types` + `exports`, `files: src/, dist/`) and the scripts.
- `README.md` — a short npm-facing pitch (install snippets + a handful of examples); the full API reference lives in `docs/`, kept in sync with `src/WebHotkeys.js` when changing public behavior (parameter names, options, method semantics).
- `mkdocs.yml` + `docs/` — the mkdocs-material documentation site (`index.md`, `usage.md`, `options.md`, `hotkeys.md`, `layouts.md`, `elements-groups.md`, `help-remapping.md`, `list.md`, `debugging.md`, `migration.md`), deployed to GitHub Pages by `.github/workflows/docs.yml` (`mkdocs gh-deploy`) on every push to main. `docs/example.html` is the live usage demo, served at `https://cz-nic.github.io/webhotkeys/example.html`; it references the library as `../src/WebHotkeys.js` with `data-register`.
- `CHANGELOG.md` — one entry per released version, newest first; the top heading of the work in progress reads `# <version> (unreleased)`.
- `test/*.test.js` — plain Node scripts (no framework, no dependencies). Each test file loads the library into a `vm` context with a minimal `document`/`HTMLElement`/`MutationObserver` stub. Run them all with `npm test`, or a single one with `node test/<name>.test.js`. `npm run test:min` runs the same suite against `dist/WebHotkeys.min.js` (via the `WH_FILE` env var) — that is the only guard against the minifier breaking something, so keep new tests loading the file through `WH_FILE`. `test/esm-import.test.mjs` and `test/npm-require.test.js` cover the package entry points and need no stub.
- Untracked scratch (gitignored): `ARTICLE.md` (blog post draft with a competitor comparison - the numbers are a snapshot, re-check before publishing), `BACKLOG.md` (ideas and deferred decisions), `_untracked` (the original "shadow shortcut" notes, superseded by `CODE_ALIASES`/`KEY_ALIASES` resolved in `_candidates`).

For anything not covered by the Node tests (rendering, real `KeyboardEvent`s, DOM mutation timing), verify manually by opening `docs/example.html` in a browser and exercising the shortcuts.

## Versioning

Releasing is one command: `npm run release` (or `make release`). The version is not an argument: write the CHANGELOG entry under `# <version> (unreleased)` first, the script takes the number from there.

`scripts/release.js` checks the tree is clean, on main and identical to origin/main, and that CI passed on that commit (waiting via `gh run watch` while it still runs; needs an authenticated `gh`), then runs `npm version <that version>`: `preversion` lints and tests, `version` rebuilds the minified file, stamps the version and SRI hash into README.md, dates the CHANGELOG heading and runs the suite against the minified build, npm commits it as `chore(release): X` and tags it, and `postversion` pushes with `--follow-tags`. Tags stay bare (`1.1.0`, no `v`); `.npmrc` sets that and the commit message. Pushing the tag triggers `.github/workflows/release.yml`, which first runs the whole `ci.yml` (as a reusable workflow, `needs: ci`), then checks the tag against `package.json` and publishes to npm via Trusted Publishing (OIDC, no token) and creates the GitHub release (notes = the CHANGELOG section, `dist/WebHotkeys.min.js` attached); jsDelivr serves the new version from npm right after.

## Architecture

Everything lives in `src/WebHotkeys.js` as five cooperating pieces:

- **`WebHotkeys`** — the entry point (`window.webHotkeys` when loaded with `data-register`). Owns `_hotkeys` (a map keyed by a `KeyState` string — see below — to an array of `Hotkey`s, most-recently-grabbed first), `_dom` (a `WeakMap` linking DOM elements to their `Hotkey`), and `_groups`. Sets up one `keydown` listener and one `MutationObserver` for the whole page.
- **`Hotkey`** — one bound shortcut. Can be tied to a DOM element (via `[data-hotkey]` or passing an element/selector as the action) or to a plain callback. Elements get their hint text appended to `title`/innerText/label on construction, guarded by a `data-webhotkeys-displayed` marker so re-hinting is idempotent across clones.
- **`HotkeyGroup`** — an `Array<Hotkey>` with `enable`/`disable`/`toggle` that fan out to every member. Populated either explicitly via `wh.group(name, definitions)` or implicitly from `[data-hotkey-group]` ancestors.
- **`_List`** — the `wh.list(...)` helper for arrow-key navigation over a set of DOM nodes (e.g. menu items), independent of the hotkey registry itself.
- **`_Grid`** — the `wh.grid(rowQuery, cellQuery, options)` helper for 2D navigation over a table (Up/Down keep the column, Left/Right move within a row); every call is an independent instance.

Key mechanics worth understanding before touching `_trigger`, `grab`, or `Hotkey.disable`:

- **Dual keying.** A hotkey is resolved by *either* `event.code` (layout-independent, e.g. `KeyF`, `Digit1`) *or* `event.key` (layout-dependent, e.g. `f`, `1`, `?`). `_parseHotkey` picks `code` vs `key` based on string length (`key.length === 1` → treat as `key`, e.g. `"f"`; otherwise → treat as `code`, e.g. `"KeyF"`). `code` and `key` live in separate storage slots and `_trigger` checks both, `code` first.
- **`KeyState` collisions.** The registry key is `(event.key || event.code) + modifierBits`. Multiple unrelated `Hotkey`s can legitimately share one `KeyState` slot's array (e.g. two different hotkeys both landing under the same code+modifier bucket, or a hotkey and a later-disabled one). `Hotkey.disable()` therefore looks up its own index via `indexOf` and splices *that* index — never assume the last item in the array belongs to `this` (see the fix in commit `8217876`: a bare `splice(-1, 1)` on an already-disabled hotkey removed a *different* hotkey sharing the combination).
- **Conflict resolution order.** Within one `KeyState` bucket, the most recently `grab()`-bound (or most recently `enable()`-d) hotkey is tried first (`unshift`, not `push`). `_trigger` walks the bucket and keeps going to the next candidate if `scope` doesn't match or the action explicitly returns `false`.
- **Text-input guarding.** `_trigger` bails out early for plain letter keys, text-navigation keys (arrows/Home/End/Delete/Backspace), and Enter/Tab, when focus is inside a form field or `contenteditable` — so hotkeys don't fight normal text editing. `Ctrl`/`Alt`/`Meta` combos and non-text keys (`F1`, etc.) bypass this guard.
- **Sequences.** A hotkey is a *list* of parsed combinations (`hotkey.sequence`); a plain one has a single item. It is registered in the registry under its **last** combination, and `_trigger` verifies the preceding ones against `_buffer` (recent keystrokes + timestamps). `_candidates` sorts longer sequences first, so `g i` beats a plain `i`. When nothing matched but the buffer is a prefix of some sequence, the key is swallowed and we wait; otherwise the buffer is cleared.
- **Live DOM sync.** With `observe: true`, a single page-wide `MutationObserver` grabs/ungrabs hotkeys as `[data-hotkey]` elements (or their `[data-hotkey-group]` ancestors) are added, removed, or have the attribute mutated — this is what lets `data-hotkey` be added/removed dynamically without calling `grab`/`disable` manually.
