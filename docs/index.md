# WebHotkeys

Easy solution to integrate keyboard hotkeys into the webpage.

Load it from the CDN or install it from npm - see the [CDN snippet with the current
version/SRI hash](https://github.com/CZ-NIC/webhotkeys#readme) in the README, kept in sync with
every release by the build script.

```bash
npm install webhotkeys
```

```javascript
import WebHotkeys from "webhotkeys" // or: const WebHotkeys = require("webhotkeys")
const wh = new WebHotkeys()
```

Both ESM (`import`) and CommonJS (`require`) work and TypeScript definitions are bundled. Note the npm/bundler build does not auto-register on `window.webHotkeys` (there is no `data-register` attribute there) - create the instance yourself as shown above.

## Quickstart

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

See the live [example](example.html), and [Usage](usage.md) for more.
