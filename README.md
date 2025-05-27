# WebHotkeys

Easy solution to integrate keyboard hotkeys into the webpage.

```javascript
<script src="https://cdn.jsdelivr.net/gh/e3rd/WebHotkeys@0.9.4/WebHotkeys.js?register"></script>
```

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

# Example
See the live [example](https://e3rd.github.io/WebHotkeys/example.html).

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
| replaceAccesskeys    | boolean | true | If true, [accesskey] elements will be converted to hotkeys.                      |
| observe              | boolean | true | Monitors DOM changes. Automatically un/grab hotkeys as DOM elements with the given selector dis/appear. |
| onToggle             | function| undefined |  When having a DOM element linked, run this callback on hotkey toggle. This will be set to the hotkey, first parameter being the element, second boolean whether it got enabled. |
| selector             | string  | `data-hotkey` | Attribute name to link DOM elements to shorcuts.      |
| selectorGroup        | string  | `data-hotkey-group` |  Attribute name to link DOM elements to shorcut groups. |

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

    If multiple hotkeys are defined, only the last one defined is executed (unless it returns `false`, in which case the next one is tried). We skip hotkeys that are not in the correct scope or whoise underlying element is disabled.

    Possible modifiers are: `Alt`, `Shift`, `Ctrl` (`Control`).

    "We attempt to determine whether the hotkey should not be triggered. Such as triggering hotkeys like `a` or `Delete` in an `<input>` contents, which makes no sense, but `F2` does.

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
Display hints.

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

### Method `getClue`
*return string*

Get hotkey combination for the text representation.

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

### Migrate from 0.7 to 0.8
(Remove the paragraph.)

```
KEY\.([A-Z]\w+), "\L$1",
KEY\.([A-Z]), $1
wh\.press\( wh.grab(
wh\.pressAlt\(" wh.grab("Alt+
removed get_info_pairs()
```