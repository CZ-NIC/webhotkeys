# 0.11.0 (unreleased)
Add: the F1 dialog is a remapping screen - the user clicks a combination, presses their own, `↺` restores the default. Conflicts are marked, the layout is stored in the `localStorage` right away. Turn it off with `remap: false`.
Add: `record({sequence: true})` records a whole sequence (`g i`), committed once the user pauses; `onProgress` reports what has been typed so far.
Add: `onRemap` option hands the whole layout over on every change (ex: store it with the user account).
Add: `Hotkey.rebind()` with no argument puts the hotkey back to its default combination.
Change: `applyRemapping` is the full state - a hotkey missing from the map returns to its default. The map now also applies to the hotkeys grabbed later on, so a layout may be loaded before the view mounts.
Change: the remapping is persisted by default (`localStorage`, the `webhotkeys.remap` key); `persistRemapping` is only needed when `remap` is off and keeps its own `webhotkeys` default.
Fix: `applyRemapping` drops an entry that is not a key combination. A remapping loaded from the `localStorage` or from a server used to reach the element hint unchecked - with the `hint: 'text'` option that is an `innerHTML` write, hence an XSS vector on a layout coming from another user.
Change: a foreign value found under our `localStorage` key is left intact - the layout is not persisted and a warning names the key. The page shares the origin with us.

# 0.10.0 (2026-08-08)
Add: key sequences (`g i`) and double taps (`Shift Shift`).
Add: `Mod+` modifier (Ctrl / Cmd by the platform) and the Apple symbols (⌘⌥⇧⌃) in the hints on a Mac. `Meta` is no longer missing from the clue.
Add: `destroy()` detaches the listener and the observer, `Hotkey.remove()` / `HotkeyGroup.remove()` forget a hotkey for good.
Add: F1 opens a filterable modal dialog (`help: 'alert'` restores the old alert), `showHints()` badges the elements the Vimium way (`hintKey` option).
Add: user remapping - `record()`, `Hotkey.rebind()`, `getRemapping()`, `applyRemapping()`, `persistRemapping()`.
Add: `getConflicts()` and the `warnConflicts` option reveal the combinations grabbed twice.
Add: `Hotkey.allowInInput()` and the `ignore` option to control the text-field guard, `onTrigger` / `onMiss` callbacks.
Add: `[data-hotkey-action]` overrides click/focus (`click`, `focus`, `toggle`, `none`).
Add: numpad falls back to the main row (`Numpad1` -> `Digit1`), friendly spellings (`Return`, `Esc`, `Up`...).
Add: list helper got `setWrap`, `setScroll`, `handleHomeEnd`, `handleTypeahead`, `goFirst`, `goLast`.
Add: npm package ships an ESM entry point and TypeScript definitions.
Add: minified build `WebHotkeys.min.js` with an SRI hash in the README snippet, `npm run build` / `npm run test:min`, CI and a one-command release.
Fix: the scope and the text-field guard now pierce the shadow DOM.
Fix: a hotkey linked to a hidden element (`display:none`, `[hidden]`, `[inert]`) no longer swallows the combination.
Fix: `simulate({code: "Digit1"})` (an event without the `key` property) threw.

# 0.9.7 (2026-08-08)
Add: installable from npm (`npm install webhotkeys`), usable via `require`/`import`. The classic `<script>` tag usage is unaffected.

# 0.9.6 (2026-08-08)
Fix: a hotkey group named "constructor" (or any other name colliding with an inherited Object property, e.g. "__proto__") crashed or corrupted the internal group registry. `_hotkeys`/`_groups` now use `Object.create(null)`.

# 0.9.5 (2026-07-19)
Fix: disabling an already disabled hotkey spliced the last foreign hotkey sharing the combination out of the registry.

# 0.9.4 (2025-05-27)
License set to LGPL.
