# 1.0.0 (2026-09-11)
feat: `wh.grid(rowQuery, cellQuery, options)` - 2D keyboard navigation over a table (Up/Down keep the column and move between rows, Left/Right move within a row, `grid.go(rows, cols)` programmatically). Every call returns its own independent instance, so several tables can coexist on the same page (give each a `scope` so their arrow keys don't collide).
feat: key sequences (`g i`) and double taps (`Shift Shift`).
feat: `Mod+` modifier (Ctrl / Cmd by the platform) and the Apple symbols (⌘⌥⇧⌃) in the hints on a Mac. `Meta` is no longer missing from the clue.
feat: `hintKey` option (default `'F2'`) toggles Vimium-style badges over the grabbed elements
feat: `{scope, inInput, group}` as `grab`'s 4th parameter (`grab(hotkey, hint, action, {scope, inInput: true, group: "Dialog"})`, or a bare scope/selector/function as before) and the `ignore` option control the text-field guard; `Hotkey.allowInput` is a public, settable property. `onTrigger` / `onMiss` callbacks report what fired or didn't.
feat: `[data-hotkey-action]` overrides what happens with the element (`click`, `focus`, `toggle`, `none`). The default is picked from the element itself: a text field is focused, a checkbox/radio/submit/button/file input clicked, a `<details>` toggled (clicking it would do nothing - the native toggle sits on the `<summary>`), and a radio also takes the focus, so the arrows may go on choosing within its group.
feat: numpad falls back to the main row (`Numpad1` -> `Digit1`), friendly spellings (`Return`, `Esc`, `Up`...).
feat: several lists can coexist on one page.
feat: npm package ships an ESM entry point and TypeScript definitions, minified build `WebHotkeys.min.js` with an SRI hash in the README snippet
fix: the scope and the text-field guard now pierce the shadow DOM.
fix: a focused radio, submit button, range or color input used to count as a typing context and swallow every plain letter hotkey; only the real text fields do now.
fix: a hotkey linked to a hidden element (`display:none`, `[hidden]`, `[inert]`) no longer swallows the combination.
fix: `simulate({code: "Digit1"})` (an event without the `key` property) threw; `simulate()` now also fills in the missing `key`/`code` for named keys (arrows, `Home`/`End`, `Enter`, `Escape`...) and for `KeyF`/`Digit1`-style codes, so a simulated keystroke is blocked by the text-field guard the same way a real one is.

# 0.9.7 (2026-08-08)
feat: installable from npm (`npm install webhotkeys`), usable via `require`/`import`. The classic `<script>` tag usage is unaffected.

# 0.9.6 (2026-08-08)
fix: a hotkey group named "constructor" (or any other name colliding with an inherited Object property, e.g. "__proto__") crashed or corrupted the internal group registry. `_hotkeys`/`_groups` now use `Object.create(null)`.

# 0.9.5 (2026-07-19)
fix: disabling an already disabled hotkey spliced the last foreign hotkey sharing the combination out of the registry.

# 0.9.4 (2025-05-27)
License set to LGPL.
