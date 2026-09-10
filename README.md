# WebHotkeys

Easy solution to integrate keyboard hotkeys into the webpage.

```html
<script src="https://cdn.jsdelivr.net/gh/CZ-NIC/webhotkeys@0.10.0/WebHotkeys.min.js?register"
        integrity="sha384-55rjsm8mxmUYTBiTOyaoPXo7/6mVRioI/eyv4mSd3iI0EDUcgRuL2RXVqn45aCgz"
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

## Examples

A tour through what the library can do. Each line is standalone, copy what you need.

```javascript
const wh = window.webHotkeys // or: const wh = new WebHotkeys()

// Plain combinations. The last parameter is optional in every `grab` call.
wh.grab("Alt+s", "Save the form", () => form.submit())
wh.grab("?", "Show the help", () => wh.toggleHelp(true)) // no need to mention Shift for a symbol
wh.grab("Mod+k", "Search", openSearch)                 // Ctrl+k, but Cmd+k on a Mac

// A sequence, GitHub style: hit `g`, then `i`.
wh.grab("g i", "Go to issues", () => location.assign("/issues"))

// An element instead of a callback - it gets clicked (or focused, if it is a form field).
wh.grab("Alt+n", "Focus the note", "#note")

// Groups: enable or disable a whole screen worth of hotkeys at once.
const editing = wh.group("Editing", [
    ["Ctrl+b", "Bold", () => exec("bold")],
    ["Ctrl+i", "Italics", () => exec("italic")],
])
editing.disable()

// Housekeeping.
wh.toggleHints(true)   // badge every element having a hotkey, the Vimium way
wh.destroy()           // detach everything (SPA unmount)
```

Declaratively, without touching JavaScript at all:

```html
<div data-hotkey-group="Navigation">
    <a href="/inbox" data-hotkey="g i" title="Go to the inbox">Inbox</a>
    <button data-hotkey="Alt+n" title="New message">New</button>
</div>
```

See the live [example](https://cz-nic.github.io/webhotkeys/example.html).

## Documentation

Full API reference, options, keyboard layouts and migration notes:
**[cz-nic.github.io/webhotkeys](https://cz-nic.github.io/webhotkeys/)**

## License

LGPL-3.0-or-later
