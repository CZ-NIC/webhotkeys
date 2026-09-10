# 1.0.0 (unreleased)
Add: `wh.grid(rowQuery, cellQuery, options)` - 2D keyboard navigation over a table (Up/Down keep the column and move between rows, Left/Right move within a row). Every call returns its own independent instance, so several tables can coexist on the same page (give each a `scope` so their arrow keys don't collide).
Add: key sequences (`g i`) and double taps (`Shift Shift`).
Add: `Mod+` modifier (Ctrl / Cmd by the platform) and the Apple symbols (⌘⌥⇧⌃) in the hints on a Mac. `Meta` is no longer missing from the clue.
Add: `destroy()` detaches the listener and the observer, `Hotkey.remove()` / `HotkeyGroup.remove()` forget a hotkey for good.
Add: `helpKey` option (default `'F1'`, `null` grabs nothing) opens a filterable modal remapping dialog - the user clicks a combination, presses their own, `↺` restores the default. Conflicts are marked, the layout is stored in `localStorage` right away, governed by the `remap` option (`true` for `webhotkeys.remap`, a string for a custom key, `false` to skip persistence).
Add: `hintKey` option (default `'F2'`) toggles Vimium-style badges over the grabbed elements; `toggleHints(show = null)` / `toggleHelp(show = null)` do it programmatically (`null` toggles, `true`/`false` forces the state).
Add: `record(callback, {sequence, onProgress})` captures a keystroke or a whole sequence (`g i`), committed once the user pauses; `Hotkey.rebind(combination)` rebinds it, with no argument back to its default. `remapping()` returns the current layout, `remapping(map)` applies a full one (`null`/`{}` clears it; a hotkey missing from the map returns to its default); `onRemap` hands the whole layout over on every change (ex: store it with the user account).
Add: `getConflicts()` and the `warnConflicts` option reveal the combinations grabbed twice.
Add: `{scope, inInput}` as `grab`'s 4th parameter (`grab(hotkey, hint, action, {scope, inInput: true})`, or a bare scope/selector/function as before) and the `ignore` option control the text-field guard; `Hotkey.allowInput` is a public, settable property. `onTrigger` / `onMiss` callbacks report what fired or didn't.
Add: `[data-hotkey-action]` overrides click/focus (`click`, `focus`, `toggle`, `none`).
Add: numpad falls back to the main row (`Numpad1` -> `Digit1`), friendly spellings (`Return`, `Esc`, `Up`...).
Add: `Hotkey.clue`/`combination`/`text` read-only getters; `WebHotkeys.getText()` still assembles the whole legend.
Add: list helper - `wh.list(query, options)` with `current`, `css`, `wrap`, `scroll`, `onChange`, `onChanged`, `upDown`, `homeEnd`, `typeahead`, `scope`; `goNext`/`goPrev`/`goFirst`/`goLast`/`go`/`selectByPrefix` to move programmatically, a `current` getter/setter for the selected element. Every call returns its own independent instance (like `grid()`), so several lists can coexist on one page.
Add: npm package ships an ESM entry point and TypeScript definitions.
Add: minified build `WebHotkeys.min.js` with an SRI hash in the README snippet, `npm run build` / `npm run test:min`, CI and a one-command release.
Fix: the scope and the text-field guard now pierce the shadow DOM.
Fix: a hotkey linked to a hidden element (`display:none`, `[hidden]`, `[inert]`) no longer swallows the combination.
Fix: `simulate({code: "Digit1"})` (an event without the `key` property) threw; `simulate()` now also fills in the missing `key`/`code` for named keys (arrows, `Home`/`End`, `Enter`, `Escape`...) and for `KeyF`/`Digit1`-style codes, so a simulated keystroke is blocked by the text-field guard the same way a real one is.
Fix: a remapping loaded from `localStorage` or from a server used to reach the element hint unchecked - with the `hint: 'text'` option that is an `innerHTML` write, hence an XSS vector on a layout coming from another user. `remapping(map)` now drops any entry that is not a key combination.
Fix: a foreign value found under our `localStorage` key is left intact - the layout is not persisted and a warning names the key. The page shares the origin with us.
Fix: `warnConflicts` used to call `getConflicts()` (a full scan of every grabbed hotkey) on every single `grab()`, making it quadratic; it now only scans the bucket the new hotkey lands in.
Fix: a plain hotkey sharing the first key of a longer sequence (ex: `g` next to `g i`) used to fire immediately and eat the sequence for good; it is now held back for `sequenceTimeout`, so the sequence gets a chance to complete first. `warnConflicts` flags such pairs too.

# 0.9.7 (2026-08-08)
Add: installable from npm (`npm install webhotkeys`), usable via `require`/`import`. The classic `<script>` tag usage is unaffected.

# 0.9.6 (2026-08-08)
Fix: a hotkey group named "constructor" (or any other name colliding with an inherited Object property, e.g. "__proto__") crashed or corrupted the internal group registry. `_hotkeys`/`_groups` now use `Object.create(null)`.

# 0.9.5 (2026-07-19)
Fix: disabling an already disabled hotkey spliced the last foreign hotkey sharing the combination out of the registry.

# 0.9.4 (2025-05-27)
License set to LGPL.
