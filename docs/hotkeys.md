# Hotkeys

## Method `grab`
*return [Hotkey](elements-groups.md#hotkey-object)*

Start listening to a hotkey. Specify hint and callback to be triggered on hit. Returns a
[`Hotkey`](elements-groups.md#hotkey-object) object. It accepts following parameters:

* `hotkey` (`string`)
    Key combination to be grabbed. Either use any `code` value https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values of the event:

    ```javascript
    wh.grab("Digit1", "Hint", () => alert("Digit1 key (whatever keyboard layout) hit"))
    wh.grab("Alt+ArrowDown", "Hint", () => alert("Alt+ArrowDown hit"))
    wh.grab("KeyF", "Hint", () => alert("Litter f hit (specified by the `code` property)"))
    ```

    Or use any `key` value
    ```javascript
    wh.grab("1", "Hint", () => alert("Number 1 hit"))
    wh.grab("+", "Hint", () => alert("Plus sign hit"))
    wh.grab("?", "Hint", () => alert("Question mark hit (you don't have to mention shift in the hotkey)"))
    wh.grab("Alt++", "Hint", () => alert("Plus sign with the Alt hit"))
    wh.grab("f", "Hint", () => alert("Letter f hit (specified by the `key` property)"))
    ```

    If you define both `code` and `key`, the `code` takes precedence, and then the last one defined takes precedence.

    Handling conflicts: If multiple hotkeys are defined, only the last one defined is executed (unless it returns `false`, in which case the next one is tried). We skip hotkeys that are not in the correct scope or whose underlying element is disabled or hidden. Use [`getConflicts`](debugging.md#method-getconflicts) or the [`warnConflicts`](options.md#warnconflicts) option to spot the duplicates.

    Possible modifiers are: `Alt`, `Shift`, `Ctrl` (`Control`), `Meta` (`Cmd`) and `Mod`.

    `Mod` is the "the usual one" modifier – it becomes `Meta` (⌘) on a Mac and `Ctrl` anywhere else, so a single definition fits every platform:

    ```javascript
    wh.grab("Mod+s", "Save", save) // Ctrl+s on Linux/Windows, Cmd+s on a Mac
    ```

    On a Mac, the hints are rendered with the Apple symbols (`⌘⇧k`). Set the `mac` option to `false` (or `true`) to override the autodetection.

    These friendlier spellings are accepted too: `Return` (= `Enter`), `Esc`, `Del`, `Ins`, `Up`, `Down`, `Left`, `Right`, `PgUp`, `PgDown`.

    **Sequences.** Separate the combinations by a space and the hotkey only fires when they are typed one after another (within `sequenceTimeout`, one second by default). The prefix key is swallowed while the sequence is pending, so it does not leak to the page.

    ```javascript
    wh.grab("g i", "Go to issues", () => location.assign("/issues"))
    wh.grab("Ctrl+k Ctrl+s", "Keyboard settings", openSettings)
    wh.grab("Shift Shift", "Search everywhere", openSearch) // a lone modifier tapped twice
    ```

    A sequence beats a plain hotkey ending with the same key – `i` still works on its own, `g i` wins when `g` preceded it.

    A plain hotkey starting with the same key as a sequence is held back for `sequenceTimeout`, in case the sequence is what the user is actually typing – grab both `g` and `g i` and pressing `g` alone still fires the plain hotkey, just after that short delay; pressing `g` then `i` fires the sequence instead, with no delay perceptible for `g i` itself.

    **Keyboard layouts.** A multi-character name is a `code` (a physical key, layout independent), a single character is a `key` (the character produced, layout dependent) – see [Keyboard layouts](layouts.md).

    **The numeric keypad** falls back to the main row: a hotkey grabbed as `Digit1` or `Enter` fires from `Numpad1` / `NumpadEnter` as well, unless another hotkey claims the numpad code explicitly.

    **Text-input guard.** We try to determine whether a hotkey should not be triggered - for example, when pressing keys like `a` or `Delete` inside an `<input>` field, which wouldn't make sense. This guards plain letter keys, text-navigation keys (arrows, Home/End, Delete, Backspace) and Enter/Tab while focus is inside a form field or `contenteditable`. `Escape`, function keys (`F2`, ...) and `Ctrl`/`Alt`/`Meta` combinations are **not** guarded - they still fire inside a text field.

    Some special hotkeys like `Ctrl+PageDown` will likely never be passed to the webpage and therefore do not function.
* `hint` (`string`): Text shown in the help dialog and hint badges.
* `action` (`{string|HTMLElement|Function}`): What will happen on hotkey trigger.
     *  If action returns false, hotkey will be treated as non-existent and event will propagate further.
     *  If action is a HTMLElement or its string selector, its click or focus method (form elements) is invoked instead.
* `scope` (`{HTMLElement|string|Function}|{scope, inInput, group}`): Scope within the hotkey is allowed to be launched, or an options object.
     *  The scope can be an HTMLElement that the active element is being search under when the hotkey triggers.
     *  The scope can an HTMLElement selector, does not have to exist at the shorcut definition time.
     *  The scope can be a function, resolved at the keystroke time. True means the scope matches. That way, you can implement negative scope.
     *  (Ex: down arrow should work unless there is DialogOverlay in the document root.)
     *  Pass `{scope, inInput: true}` instead to fire the hotkey even while the user is typing into an
        input or a contenteditable (ex: arrow keys navigating a combobox's suggestion list):
        ```javascript
        wh.grab("ArrowDown", "Next suggestion", next, { scope: "#combo", inInput: true })
        ```
     *  `group` adds the hotkey to a named [`HotkeyGroup`](elements-groups.md#hotkeygroup-object), same as passing it through `wh.group(name, [[...]])`:
        ```javascript
        wh.grab("Escape", "Close", close, { group: "Dialog" })
        ```

## Method `group`
*return [HotkeyGroup](elements-groups.md#hotkeygroup-object)*

Grab multiple hotkeys at once. Returns a `HotkeyGroup` that you may call methods `enable`, `disable`, `toggle(enable=null)` on.

```javascript
// name, definitions (grab method parameters as a list)
const general = wh.group("General hotkeys", [
    ["n", "Next", () => this.nextFrame()],
    ["p", "Prev", () => this.previousFrame()],
])

general.disable() // disable all hotkeys
general.toggle() // re-enable them
general.toggle(false) // re-disable them
```

Alternatively, you can set the group in the DOM. If not changed by `groupAttribute`), use the `[data-hotkey-group]` attribute either on the element or on any of its ancestors:

```html
<a href="..." data-hotkey="Alt+1" data-hotkey-group="Global shortcuts" title="Go to an example link 1">link 1</a>
<div data-hotkey-group="Global shortcuts">
    <a href="..." data-hotkey="Alt+2" title="Go to an example link 2">link 2</a>
</div>
```

Such group can be accessed via the method `group` too:

```js
wh.group("Global shortcuts").disable()
```
