# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WebHotkeys — a small, dependency-free vanilla JS library for binding keyboard shortcuts on a webpage, either declaratively via `[data-hotkey]` attributes or programmatically via `window.webHotkeys.grab(...)`. Distributed as a single file loaded directly from a CDN (jsDelivr pointing at this GitHub repo), not as an npm package.

## Repository layout

There is no build system, package manager, bundler, or linter. The entire library is `WebHotkeys.js` — a single self-contained file with no dependencies. Everything else is documentation/support:

- `WebHotkeys.js` — the whole library (classes `WebHotkeys`, `Hotkey`, `HotkeyGroup`, `_List`).
- `example.html` — live usage demo, also published as GitHub Pages at the URL in README.md.
- `README.md` — the API reference; keep it in sync with `WebHotkeys.js` when changing public behavior (parameter names, options, method semantics).
- `CHANGELOG.md` — one entry per released version, newest first; update when bumping the version.
- `test/*.test.js` — plain Node scripts (no framework, no dependencies). `WebHotkeys.js` is a browser script with no `module.exports`, so each test file loads it into a `vm` context with a minimal `document`/`HTMLElement`/`MutationObserver` stub. Run a single file with `node test/<name>.test.js`; there's no aggregate runner, so run each file individually (or `for f in test/*.test.js; do node "$f"; done`).
- `_untracked` — scratch notes about a half-implemented "shadow shortcut" feature (e.g. `Enter`/`Return` aliasing). Not wired into the code; treat as a TODO/idea log, not active code.

For anything not covered by the Node tests (rendering, real `KeyboardEvent`s, DOM mutation timing), verify manually by opening `example.html` in a browser and exercising the shortcuts.

## Versioning

The CDN URL in README.md pins a version tag (e.g. `WebHotkeys@0.9.4`). When cutting a release: bump the version referenced in README.md's script tag, add a `CHANGELOG.md` entry, and tag the commit accordingly.

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
- **Live DOM sync.** With `observe: true`, a single page-wide `MutationObserver` grabs/ungrabs hotkeys as `[data-hotkey]` elements (or their `[data-hotkey-group]` ancestors) are added, removed, or have the attribute mutated — this is what lets `data-hotkey` be added/removed dynamically without calling `grab`/`disable` manually.
