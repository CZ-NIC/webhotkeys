# Usage

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

Removing the register parameter forces you to create the `new WebHotkeys` yourself. See [Options](options.md) for the constructor's options object.

```javascript
const wh = new WebHotkeys({"helpKey": null})
```

### Method `setOptions`
*return self*

Takes the same options object as the constructor. Allows dynamic options change.

## Declarative attributes

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

* `[data-hotkey]` grabs the combination.
* `[data-hotkey-action]` overrides what happens with the element: `click`, `focus`, `toggle`, `none`.
* `[data-hotkey-group]`, on the element or any ancestor, groups hotkeys so they can be enabled/disabled together - see [Elements & groups](elements-groups.md).

See the live [example](example.html).
