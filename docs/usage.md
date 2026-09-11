# Usage

The library intercepts [KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) on key down and reads its `code`, `key` and modifier properties.

## `WebHotkeys` object

### Using `data-register`

If you load the script with the `data-register` attribute, you have nothing more to do.

```html
<script src=".../WebHotkeys.js" data-register></script>
```

On load, the `data-register` attribute makes a `new WebHotkeys` instance being implicitly stored to `window.webHotkeys`. Then it grabs all `[data-hotkey]` elements and puts its title as a help text.

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

Removing the `data-register` attribute forces you to create the `new WebHotkeys` yourself. When
loaded as a classic `<script>` tag, the class is exposed as `window.WebHotkeys` (and `window.Hotkey`,
`window.HotkeyGroup`) for exactly this. See [Options](options.md) for the constructor's options object.

```javascript
const wh = new WebHotkeys({"helpKey": null})
// or, if the file was vendored and you only know the global name:
const wh = new window.WebHotkeys({"helpKey": null})
```

### Method `setOptions`
*return self*

Takes the same options object as the constructor. Allows dynamic options change.

### Vendoring without npm

`WebHotkeys.js`/`WebHotkeys.min.js` has no runtime dependencies, so a project without a build step
or npm (a content script, a static site) can just copy the file in - no bundler, no `require`. Two
ways to get an instance:

* `<script src="WebHotkeys.min.js" data-register></script>` and use `window.webHotkeys`, as above.
* `<script src="WebHotkeys.min.js"></script>` and call `new window.WebHotkeys()` yourself.

`WebHotkeys.min.js` is not in the git repository - it is generated into `dist/` at publish
time. Grab it from the CDN (`https://cdn.jsdelivr.net/npm/webhotkeys/dist/WebHotkeys.min.js`),
from the npm tarball, or build it yourself with `npm run build`. The readable source is
`src/WebHotkeys.js`.

A vendored copy does not update itself - note the version from the first line of
`WebHotkeys.min.js` (the banner also repeats both usages above) so you know when to re-copy it.

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
