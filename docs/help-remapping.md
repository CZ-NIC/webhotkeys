# Help & remapping

## Method `toggleHelp`
*return this*

`toggleHelp(show = null)` – `null` toggles, `true`/`false` forces the state.

Display the hotkey list in a filterable modal dialog (closed by `Escape`, `F1` or the ✕ button). This is what `F1` does by default; call it from your own help button too. When the DOM is unavailable, or with the `help: 'alert'` option, a plain `alert` is used instead.

Unless you set `remap: false`, every combination in the dialog is a button. The user clicks it, presses their own keys and the hotkey moves there – no settings screen of yours needed:

* a whole **sequence** may be recorded, not just a single combination – keep typing (`g` `i`) and the recording is committed once you pause for `sequenceTimeout`,
* `Escape` (or a second click) cancels, the dialog stays open,
* `↺` puts the default combination back,
* a combination somebody else already holds is marked red, with the rival named in the `title`,
* the change is stored in the `localStorage` right away, so it survives the reload.

The page shares the origin with us, so the storage key is never taken by force: should `webhotkeys.remap` already hold something that is not a remapping, it is left intact, the layout is not persisted and a warning names the key.

## Method `toggleHints`
*return this*

`toggleHints(show = null)` – `null` toggles, `true`/`false` forces the state.

Badge every visible element having a hotkey with its combination, the Vimium way. The badges disappear on the next keystroke, scroll or resize. Bound to `F2` by default; change it with the [`hintKey`](options.md#hintkey) option:

```javascript
const wh = new WebHotkeys({hintKey: "Alt+h"})
```

## Method `record`
*return function*

Wait for the next keystroke and hand over its definition string. The [help dialog](#method-togglehelp) uses it; reach for it directly only when you build a settings screen of your own. Returns a canceller. Every page hotkey stays silent while recording.

```javascript
const cancel = wh.record(combination => {
    myHotkey.rebind(combination) // ex: "Ctrl+KeyJ"
})

// A sequence: the keystrokes are collected until the user pauses for `sequenceTimeout`.
wh.record(combination => myHotkey.rebind(combination), {
    sequence: true,
    onProgress: partial => badge.textContent = partial // "g", then "g i"…
})
```

## Method `remapping`

Getter and setter in one, telling apart by the argument count.

The user changes as a plain object `{originalCombination: currentCombination}` – serializable, ready to be stored on your server.

```javascript
JSON.stringify(wh.remapping())  // {"Alt+r": "Alt+t"}
wh.remapping({"Alt+r": "Alt+t"})
```

`remapping(map)` validates what it is given: an entry that is not a key combination (known modifiers plus either a single character or a plain identifier like `KeyJ`) is dropped with a console warning. The map usually comes from the outside – the `localStorage`, or your server, where it may well be another user's – and it ends up in the element hint, which is `innerHTML` under the `hint: 'text'` option.

`remapping(map)` is the full state: a hotkey missing from the map returns to its default combination; `null`/`{}` clears every remapping. The map is remembered even for the hotkeys that are not grabbed yet, so a combination is honoured the moment its hotkey appears – you may apply the layout fetched from the server before the view mounts.

```javascript
const wh = new WebHotkeys({
    remap: false, // no localStorage, this app keeps the layout with the user account
    onRemap: map => fetch("/preferences", {method: "POST", body: JSON.stringify(map)})
})
wh.remapping(await (await fetch("/preferences")).json())
```

Storage is governed solely by the [`remap`](options.md#remap-onremap) option (a string is used as the `localStorage` key, `true` means `webhotkeys.remap`, `false` turns it off) – there is no separate method to opt back in.

## Method `destroy`
*return this*

Detach the `keydown` listener and the `MutationObserver`, forget every hotkey and remove the injected styles. Call it when the SPA view unmounts, otherwise the instance keeps intercepting the whole document forever.

## Method `activeElement`
*return ?HTMLElement*

The focused element, piercing the shadow DOM (unlike `document.activeElement`). Used internally for the scopes and for the "the user is typing" detection, so both work inside the web components.
