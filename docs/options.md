# Options

The constructor (and `setOptions`) accepts an options object:

| Property | Type | Default | Description |
|----------------------|---------|---------|-----------------------------------------------------------------------------------|
| [hint](#hint) | `'title'\|'text'\|false` | `title` | Append shorcut text to the element title (ex: 'anchor (Alt+1)') or its text (or its label for the case of a form element). |
| [helpKey](#helpkey) | `?string` | `'F1'` | Key combination that opens the help. `null` grabs nothing. |
| help | `'dialog'\|'alert'` | `dialog` | How the help is rendered. The dialog is a filterable modal; it falls back to the alert when the DOM is not available. |
| [hintKey](#hintkey) | `?string` | `'F2'` | Key combination toggling the visual badges over every element having a hotkey. `null` grabs nothing. |
| replaceAccesskeys | boolean | true | If true, [accesskey] elements will be converted to hotkeys. |
| [observe](#observe) | boolean | true | Monitors DOM changes. Automatically un/grab hotkeys as DOM elements with the given attribute dis/appear. |
| onToggle | function| undefined | When having a DOM element linked, run this callback on hotkey toggle. This will be set to the hotkey, first parameter being the element, second boolean whether it got enabled. |
| onTrigger | function| undefined | Called right after a hotkey fired, receives `(hotkey, event)`. Handy for logging. |
| [onMiss](#onmiss) | function| undefined | Called when a keystroke matched no hotkey, receives `(event)`. Handy for debugging. |
| [ignore](#ignore) | `string\|function` | null | Selector or `callback(activeElement, event)`. While it matches, no hotkey fires at all. |
| sequenceTimeout | number | 1000 | Milliseconds a key sequence (`'g i'`) may be spread over. Also the pause that commits a combination recorded in the help dialog. |
| [remap](#remap-onremap) | `boolean\|string` | true | The F1 dialog lets the user click a combination and press their own. A string is used as the `localStorage` key (`true` means `webhotkeys.remap`), `false` turns the editing off. |
| [onRemap](#remap-onremap) | function| undefined | Called with the whole remapping whenever the user changes a combination. Ex: store it on your server. |
| mac | boolean | null | Render the combinations the Apple way (⌘⌥⇧⌃) and resolve `Mod` to Meta. Null autodetects. |
| [warnConflicts](#warnconflicts) | boolean | false | Console warn when a newly grabbed hotkey shadows an existing scope-less one. |
| attribute | string | `data-hotkey` | Attribute name to link DOM elements to shorcuts. |
| groupAttribute | string | `data-hotkey-group` | Attribute name to link DOM elements to shorcut groups. |
| [actionAttribute](#actionattribute) | string | `data-hotkey-action` | Attribute name overriding what happens with the element: `click`, `focus`, `toggle`, `none`. |

Should you need to change a one-time variable like `helpKey`, you want to prevent the implicit `new WebHotkeys` creation. Then, create the object manually:

```javascript
const wh = new WebHotkeys({"helpKey": null})
```

## `ignore`

Selector or `callback(activeElement, event)`. While it matches, no hotkey fires at all - handy to
suspend every hotkey while a third-party widget (a rich text editor, a game canvas) has focus.

```javascript
const wh = new WebHotkeys({ ignore: "#rich-editor, [data-no-hotkeys]" })
```

## `onMiss`

Called when a keystroke matched no hotkey, receives `(event)`. Handy for debugging what a user
just pressed, or for building your own fallback behavior.

```javascript
wh.setOptions({ onMiss: e => console.log(`miss: ${e.key}`) })
```

## `hint`

```javascript
const wh = new WebHotkeys({ hint: "text" }) // append the combination to the element's text instead of its title
```

## `hintKey`

Key combination toggling the visual badges over every element having a hotkey. Bound to `F2` by
default; change it or turn it off:

```javascript
const wh = new WebHotkeys({ hintKey: "Alt+h" })
const wh = new WebHotkeys({ hintKey: null }) // grab nothing, call wh.toggleHints() yourself
```

## `helpKey`

Key combination that opens the help dialog/alert. Bound to `F1` by default:

```javascript
const wh = new WebHotkeys({ helpKey: null }) // grab nothing, call wh.toggleHelp() yourself
```

## `remap`, `onRemap`

Storage is governed solely by the `remap` option (a string is used as the `localStorage` key,
`true` means `webhotkeys.remap`, `false` turns it off). `onRemap` is called with the whole
remapping whenever the user changes a combination:

```javascript
const wh = new WebHotkeys({
    remap: false, // no localStorage, this app keeps the layout with the user account
    onRemap: map => fetch("/preferences", {method: "POST", body: JSON.stringify(map)})
})
```

See [Help & remapping](help-remapping.md) for the full `remapping()` API.

## `observe`

Monitors DOM changes with a single page-wide `MutationObserver`. Automatically un/grab hotkeys as
`[data-hotkey]` elements (or their `[data-hotkey-group]` ancestors) are added, removed, or have the
attribute mutated - this lets `data-hotkey` be added/removed dynamically without calling
`grab`/`disable` manually. Turn it off if you manage the DOM yourself and want to save the observer:

```javascript
const wh = new WebHotkeys({ observe: false })
```

## `actionAttribute`

Attribute name overriding what happens with a `[data-hotkey]` element: `click`, `focus`, `toggle`,
`none`.

The default is chosen from the element itself and covers the common cases without the attribute:

| Element | Default | Why |
|---------|---------|-----|
| text `input`, `textarea`, `select` | `focus` | the user wants to type there, not to click it |
| `input[type=range\|color]` | `focus` | the arrows adjust it once focused |
| `input[type=checkbox\|radio\|submit\|button\|reset\|image\|file]` | `click` | a mere focus would leave the control untouched |
| `details` | `toggle` | the native toggle sits on the `summary`, clicking the `details` does nothing |
| anything else (`button`, `a`, `div`...) | `click` | |

A checkbox is flipped by the click itself, and a radio also takes the focus, so the arrows may go on
choosing within its group.

```html
<input data-hotkey="Alt+t" data-hotkey-action="focus" type="submit" value="Save">
<div data-hotkey="Alt+x" data-hotkey-action="none">Hinted in the help, does nothing on its own</div>
```

## `warnConflicts`

Console warn when a newly grabbed hotkey shadows an existing scope-less one, right away instead of
having to call [`getConflicts()`](debugging.md#method-getconflicts) yourself. It also warns when a
plain hotkey and a longer [sequence](hotkeys.md) share their first key (ex: `g` next to `g i`) - the
plain one still works, but only fires after a `sequenceTimeout` delay, which is easy to miss without
the warning:

```javascript
const wh = new WebHotkeys({ warnConflicts: true })
```
