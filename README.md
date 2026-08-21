# WebHotkeys

Easy solution to integrate keyboard hotkeys into the webpage.

```html
<script src="https://cdn.jsdelivr.net/gh/CZ-NIC/webhotkeys@0.10.0/WebHotkeys.min.js?register"
        integrity="sha384-rHHgLgUUvaOdNGIryUQDkMUKB68kDdwQUzs/1xB8uJPnHEqhBMBXELei2H/F1Dvm"
        crossorigin="anonymous"></script>
```

Keep the `crossorigin="anonymous"` attribute – without it the browser refuses to verify the [integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) hash and the script does not load at all. The hash belongs to that exact version tag, so copy the whole snippet as it is; a version bumped without the matching hash means the script silently stops loading.

While debugging, drop the `.min` to get the readable source. It is a different file, hence a different hash – recompute it (`openssl dgst -sha384 -binary WebHotkeys.js | openssl base64 -A`) or leave the `integrity` attribute out of your local build.

Or install it from npm:

```bash
npm install webhotkeys
```

```javascript
import WebHotkeys from "webhotkeys" // or: const WebHotkeys = require("webhotkeys")
const wh = new WebHotkeys()
```

Both ESM (`import`) and CommonJS (`require`) work and TypeScript definitions are bundled. Note the npm/bundler build does not auto-register on `window.webHotkeys` (there is no `?register` param there) - create the instance yourself as shown above.

# Usage

Just use the `[data-hotkey]` attribute.

```html
<a href="..." data-hotkey="Ctrl+Enter" title="Help text">link</a>
<button href="..." data-hotkey="Shift+Alt+l" title="Any action">my button</button>
```

Those attributes can be dynamically added / removed.

Or use the JS interface, with the help of the `window.webHotkeys` variable.

```javascript
const wh = window.webHotkeys
// hotkey, hint, action, [scope]
wh.grab("Enter", "Displays an alert", () => alert("This happens"))
```

# Examples

A tour through what the library can do. Each line is standalone, copy what you need.

```javascript
const wh = window.webHotkeys // or: const wh = new WebHotkeys()

// Plain combinations. The last parameter is optional in every `grab` call.
wh.grab("Alt+s", "Save the form", () => form.submit())
wh.grab("?", "Show the help", () => wh.showHelp())     // no need to mention Shift for a symbol
wh.grab("Mod+k", "Search", openSearch)                 // Ctrl+k, but Cmd+k on a Mac

// A sequence, GitHub style: hit `g`, then `i`.
wh.grab("g i", "Go to issues", () => location.assign("/issues"))
wh.grab("Shift Shift", "Search everywhere", openSearch) // a double tap, IntelliJ style

// An element instead of a callback - it gets clicked (or focused, if it is a form field).
wh.grab("Alt+n", "Focus the note", "#note")
wh.grab("Escape", "Close the dialog", () => dialog.close()).allowInInput() // works while typing too

// Only while the focus is inside the dialog.
wh.grab("ArrowDown", "Next row", () => list.goNext(), "#dialog")
// Only while no dialog is open (a negative scope is just a predicate).
wh.grab("ArrowDown", "Scroll", scroll, () => !document.querySelector("dialog[open]"))

// Groups: enable or disable a whole screen worth of hotkeys at once.
const editing = wh.group("Editing", [
    ["Ctrl+b", "Bold", () => exec("bold")],
    ["Ctrl+i", "Italics", () => exec("italic")],
])
editing.disable()

// The user remaps the keys in the F1 dialog on their own; this is how you get the layout.
wh.setOptions({onRemap: map => fetch("/preferences", {method: "POST", body: JSON.stringify(map)})})

// Housekeeping.
wh.getConflicts()   // scope-less hotkeys fighting over the same combination
wh.showHints()      // badge every element having a hotkey, the Vimium way
wh.destroy()        // detach everything (SPA unmount)
```

Declaratively, without touching JavaScript at all:

```html
<div data-hotkey-group="Navigation">
    <a href="/inbox" data-hotkey="g i" title="Go to the inbox">Inbox</a>
    <button data-hotkey="Alt+n" title="New message">New</button>
</div>

<!-- a form field is focused by default, `click` it instead -->
<input data-hotkey="Alt+s" data-hotkey-action="click" type="submit" value="Save">
<!-- flip a checkbox without focusing it first -->
<input data-hotkey="Alt+c" data-hotkey-action="toggle" type="checkbox">
```

See the live [example](https://cz-nic.github.io/webhotkeys/example.html).

# Documentation

The library intercepts [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) on key down and reads its `code`, `key` and modifier properties.

## `WebHotkeys` object

### Using `register`

If you load the script with the `register` parameter, you have nothing more to do.

```html
<script src=".../WebHotkeys.js?register"></script>
```

On load, the `register` parameter makes a `new WebHotkeys` instance being implicitly stored to `window.webHotkeys`. Then it grabs all `[data-hotkey]` elements and puts its title as a help text.

```html
<a href="..." data-hotkey="Alt+1" title="Go to an example link 1">link 1</a>
<a href="..." data-hotkey="Alt+2" title="Go to an example link 2">link 2</a>
```

You can then use `window.webHotkeys` for further customisations.

```javascript
const wh = window.webHotkeys
wh.setOptions({"onToggle": ()=>{...}})
wh.grab(...)
```

### Custom mode

Removing the register parameter forces you to create the `new WebHotkeys` yourself.

The constructors accepts the following options object.


| Property             | Type    | Default | Description                                                                       |
|----------------------|---------|---------|-----------------------------------------------------------------------------------|
| hint                 | `'title'\|'text'\|false` | `title` | Append shorcut text to the element title (ex: 'anchor (Alt+1)') or its text (or its label for the case of a form element). |
| grabF1               | boolean | true | Put basic help text under F1                                                     |
| help                 | `'dialog'\|'alert'` | `dialog` | How the F1 help is rendered. The dialog is a filterable modal; it falls back to the alert when the DOM is not available. |
| hintKey              | string  | null | Key combination toggling the visual badges over every element having a hotkey. Ex: `'F2'`. |
| replaceAccesskeys    | boolean | true | If true, [accesskey] elements will be converted to hotkeys.                      |
| observe              | boolean | true | Monitors DOM changes. Automatically un/grab hotkeys as DOM elements with the given selector dis/appear. |
| onToggle             | function| undefined |  When having a DOM element linked, run this callback on hotkey toggle. This will be set to the hotkey, first parameter being the element, second boolean whether it got enabled. |
| onTrigger            | function| undefined | Called right after a hotkey fired, receives `(hotkey, event)`. Handy for logging. |
| onMiss               | function| undefined | Called when a keystroke matched no hotkey, receives `(event)`. Handy for debugging. |
| ignore               | `string\|function` | null | Selector or `callback(activeElement, event)`. While it matches, no hotkey fires at all. |
| sequenceTimeout      | number  | 1000 | Milliseconds a key sequence (`'g i'`) may be spread over. Also the pause that commits a combination recorded in the help dialog. |
| remap                | `boolean\|string` | true | The F1 dialog lets the user click a combination and press their own. A string is used as the `localStorage` key (`true` means `webhotkeys.remap`), `false` turns the editing off. |
| onRemap              | function| undefined | Called with the whole remapping whenever the user changes a combination. Ex: store it on your server. |
| mac                  | boolean | null | Render the combinations the Apple way (⌘⌥⇧⌃) and resolve `Mod` to Meta. Null autodetects. |
| warnConflicts        | boolean | false | Console warn when a newly grabbed hotkey shadows an existing scope-less one.     |
| selector             | string  | `data-hotkey` | Attribute name to link DOM elements to shorcuts.      |
| selectorGroup        | string  | `data-hotkey-group` |  Attribute name to link DOM elements to shorcut groups. |
| selectorAction       | string  | `data-hotkey-action` | Attribute name overriding what happens with the element: `click`, `focus`, `toggle`, `none`. |

Should you need to change a one-time variable like `grabF1`, you want to prevent the implicit `new WebHotkeys` creation. Then, create the object manually:

```javascript
const wh = new WebHotkeys({"grabF1": false})
```

### Method `setOptions`
*return self*

Takes the same options object as the constructor. Allows dynamic options change.

### Method `grab`
*return [Hotkey](#Hotkey-object)*

Start listening to a hotkey. Specify hint and callback to be triggered on hit. Returns a [`Hotkey`](#Hotkey-object) object. It accepts following parameters:

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

    Handling conflicts: If multiple hotkeys are defined, only the last one defined is executed (unless it returns `false`, in which case the next one is tried). We skip hotkeys that are not in the correct scope or whose underlying element is disabled or hidden. Use [`getConflicts`](#method-getconflicts) or the `warnConflicts` option to spot the duplicates.

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

    **The numeric keypad** falls back to the main row: a hotkey grabbed as `Digit1` or `Enter` fires from `Numpad1` / `NumpadEnter` as well, unless another hotkey claims the numpad code explicitly.

    We try to determine whether a hotkey should not be triggered—for example, when pressing keys like `a` or `Delete` inside an `<input>` field, which wouldn't make sense. However, keys like `F2` still do.

    Some special hotkeys like `Ctrl+PageDown` will likely never be passed to the webpage and therefore do not function.
* `hintOrAction` (`string|HTMLElement|Function`): Either hint text or an action (if the action parameter stays undefined).
* `action` (`{string|HTMLElement|Function}`): What will happen on hotkey trigger.
     *  If action returns false, hotkey will be treated as non-existent and event will propagate further.
     *  If action is a HTMLElement or its string selector, its click or focus method (form elements) is invoked instead.
* `scope` (`{HTMLElement|Function|jQuery}`): Scope within the hotkey is allowed to be launched.
     *  The scope can be an HTMLElement that the active element is being search under when the hotkey triggers.
     *  The scope can an HTMLElement selector, does not have to exist at the shorcut definition time.
     *  The scope can be a function, resolved at the keystroke time. True means the scope matches. That way, you can implement negative scope.
     *  (Ex: down arrow should work unless there is DialogOverlay in the document root.)

### Method `group`
*return [HotkeyGroup](#HotkeyGroup-object)*

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

Alternatively, you can set the group in the DOM. If not changed by `selectorGroup`), use the `[data-hotkey-group]` attribute either on the element or on any of its ancestors:

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

### Method `simulate`

Manually trigger a hotkey.

```javascript
// Simulate hitting Shift+1 hotkey
wh.grab("Shift+Digit1", "Number 1 hotkey", () => alert("Shift+Number 1 hit"))
wh.simulate("Shift+Digit1")

// You can include KeyEvent object or its part too
wh.simulate( { shiftKey: true, code: "Digit1" })
```

### Method `getText`
*return string*

The whole hotkey map as a plain text, the groups included. What the `help: 'alert'` mode displays.

### Method `getHotkeys`
*return Hotkey[]*

Every currently enabled hotkey. Pass `false` to get the disabled ones as well.

### Method `getGroups`
*return `{name, hotkeys}[]`*

The same, structured for a custom help screen. The ungrouped hotkeys come first, under an empty name.

### Method `getConflicts`
*return `{combination, hotkeys}[]`*

Scope-less hotkeys fighting over the same combination. Only the last grabbed one runs, the others are reached solely when it returns `false` – which is usually a bug, not an intention.

```javascript
console.table(wh.getConflicts()) // [{combination: "Alt+c", hotkeys: [Hotkey, Hotkey]}]
```

Set the `warnConflicts` option to have every such `grab` warned about right away.

### Method `showHelp` / `hideHelp`
*return this*

Display the hotkey list in a filterable modal dialog (closed by `Escape`, `F1` or the ✕ button). This is what `F1` does by default; call it from your own help button too. When the DOM is unavailable, or with the `help: 'alert'` option, a plain `alert` is used instead.

Unless you set `remap: false`, every combination in the dialog is a button. The user clicks it, presses their own keys and the hotkey moves there – no settings screen of yours needed:

* a whole **sequence** may be recorded, not just a single combination – keep typing (`g` `i`) and the recording is committed once you pause for `sequenceTimeout`,
* `Escape` (or a second click) cancels, the dialog stays open,
* `↺` puts the default combination back,
* a combination somebody else already holds is marked red, with the rival named in the `title`,
* the change is stored in the `localStorage` right away, so it survives the reload.

The page shares the origin with us, so the storage key is never taken by force: should `webhotkeys.remap` already hold something that is not a remapping, it is left intact, the layout is not persisted and a warning names the key.

### Method `showHints` / `hideHints` / `toggleHints`
*return this*

Badge every visible element having a hotkey with its combination, the Vimium way. The badges disappear on the next keystroke, scroll or resize. Bind it with the `hintKey` option:

```javascript
const wh = new WebHotkeys({hintKey: "F2"})
```

### Method `record`
*return function*

Wait for the next keystroke and hand over its definition string. The [help dialog](#method-showhelp--hidehelp) uses it; reach for it directly only when you build a settings screen of your own. Returns a canceller. Every page hotkey stays silent while recording.

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

### Methods `getRemapping` / `applyRemapping` / `persistRemapping`

The user changes as a plain object `{originalCombination: currentCombination}` – serializable, ready to be stored on your server.

```javascript
JSON.stringify(wh.getRemapping())  // {"Alt+r": "Alt+t"}
wh.applyRemapping({"Alt+r": "Alt+t"})
```

`applyRemapping` validates what it is given: an entry that is not a key combination (known modifiers plus either a single character or a plain identifier like `KeyJ`) is dropped with a console warning. The map usually comes from the outside – the `localStorage`, or your server, where it may well be another user's – and it ends up in the element hint, which is `innerHTML` under the `hint: 'text'` option.

`applyRemapping` is the full state: a hotkey missing from the map returns to its default combination. The map is remembered even for the hotkeys that are not grabbed yet, so a combination is honoured the moment its hotkey appears – you may apply the layout fetched from the server before the view mounts.

```javascript
const wh = new WebHotkeys({
    remap: false, // no localStorage, this app keeps the layout with the user account
    onRemap: map => fetch("/preferences", {method: "POST", body: JSON.stringify(map)})
})
wh.applyRemapping(await (await fetch("/preferences")).json())
```

`persistRemapping(storageKey)` loads the layout from the `localStorage` and keeps it saved there. You only need it when you turned the `remap` option off – otherwise it is the default behaviour, under the `webhotkeys.remap` key. (Its own default key stays `webhotkeys`, the way 0.10 stored it.)

### Method `destroy`
*return this*

Detach the `keydown` listener and the `MutationObserver`, forget every hotkey and remove the injected styles. Call it when the SPA view unmounts, otherwise the instance keeps intercepting the whole document forever.

### Method `activeElement`
*return ?HTMLElement*

The focused element, piercing the shadow DOM (unlike `document.activeElement`). Used internally for the scopes and for the "the user is typing" detection, so both work inside the web components.

## `Hotkey` object

### Method `enable`
*return this*

Start listening (by default after calling `window.webHotkeys.grab`).

### Method `disable`
*return this*

Stop listening. Alternatively, you may [disable](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSelectElement/disabled) the linked HTMLElement.

### Method `toggle`
*return this*

Enable or disable. Accepts parameter `enable = null` to by set directly.

### Method `remove`
*return this*

Unlike `disable`, this forgets the hotkey for good – it disappears from its group and from the help, and its element may be grabbed again.

### Method `allowInInput`
*return this*

By default a hotkey does not fire while the user is typing into an input or a `contenteditable` (see the text guard above). This opts a single hotkey out of the rule.

```javascript
wh.grab("Escape", "Close", close).allowInInput()
wh.grab("Ctrl+Enter", "Send", send).allowInInput()
```

### Method `rebind`
*return this*

Move the hotkey to another combination. The hint in the element `title` is rewritten accordingly and the original combination is remembered for the [remapping](#methods-getremapping--applyremapping--persistremapping). Called with no argument, the hotkey goes back to its default combination.

```javascript
myHotkey.rebind("Ctrl+j")
myHotkey.rebind()  // back to the original
```

### Method `getClue`
*return string*

Get hotkey combination for the text representation. On a Mac, the Apple symbols are used (`⌘⇧k`).

### Method `getCombination`
*return string*

The platform independent definition string – what you would pass to `grab` to get the very same combination.

### Method `getText`
*return string*

Get text representation.

## `HotkeyGroup` object

### Method `enable`
*return this*

Enable all hotkeys in the group.

### Method `disable`
*return this*

Disable all hotkeys in the group.

### Method `toggle`
*return this*

Enable or disable all hotkeys in the group. Accepts parameter `enable = null` to by set directly.

### Method `remove`
*return this*

Forget all the hotkeys in the group.

## List helper

`wh.list(query)` turns any set of elements into a keyboard navigable list (a menu, a table, a track listing).

```javascript
const list = wh.list("ul#tracks li")
    .setCurrentSelector(".active", "{background: gold}") // ':focus' by default
    .setWrap()          // the last item continues at the first one
    .handleUpDown()     // bind ArrowUp / ArrowDown
    .handleHomeEnd()    // bind Home / End
    .handleTypeahead()  // type the first letters of an item to select it

list.goNext()
list.getCurrent()
```

| Method | Description |
|--------|-------------|
| `setQuery`, `setCurrentSelector`, `setChangeFn`, `setCallback` | What is listed, how the current item is marked, what happens on change. |
| `setWrap(wrap=true)` | Jump from the last item to the first one and back. |
| `setScroll(scroll=true)` | Scroll the selected item into the view. On by default. |
| `handleUpDown`, `handleHomeEnd`, `handleTypeahead(timeout=800)` | Bind the usual listbox keys. |
| `goNext`, `goPrev`, `goFirst`, `goLast`, `go(forward, steps)`, `selectByPrefix` | Move programmatically. |
| `getCurrent`, `setCurrent` | The selected element. |
| `destroy` | Detach the typeahead listener. |

### Migrate from 0.9 to 0.10

Nothing to do, the API is backwards compatible. Two defaults changed though:

* `F1` opens a modal dialog instead of an `alert`. Set `{help: "alert"}` to get the old behaviour back.
* A hotkey linked to a **hidden** element (`display: none`, `[hidden]`, `[inert]`) no longer fires; the next hotkey sharing the combination is tried instead.

### Migrate from 0.7 to 0.8
(Remove the paragraph.)

```
KEY\.N(\d), "Digit\L$1",
KEY\.([A-Z]\w+), "\L$1",
KEY\.([A-Z]), "\L$1"
wh\.press\( wh.grab(
wh\.pressAlt\(" wh.grab("Alt+
removed get_info_pairs()
```
