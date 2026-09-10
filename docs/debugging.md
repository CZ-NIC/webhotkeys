# Debugging

## Method `simulate`

Manually trigger a hotkey.

```javascript
// Simulate hitting Shift+1 hotkey
wh.grab("Shift+Digit1", "Number 1 hotkey", () => alert("Shift+Number 1 hit"))
wh.simulate("Shift+Digit1")

// You can include KeyEvent object or its part too
wh.simulate( { shiftKey: true, code: "Digit1" })
```

## Method `getText`
*return string*

The whole hotkey map as a plain text, the groups included. What the `help: 'alert'` mode displays.

## Method `getHotkeys`
*return Hotkey[]*

Every currently enabled hotkey. Pass `false` to get the disabled ones as well.

## Method `getGroups`
*return `{name, hotkeys}[]`*

The same, structured for a custom help screen. The ungrouped hotkeys come first, under an empty name.

## Method `getConflicts`
*return `{combination, hotkeys}[]`*

Scope-less hotkeys fighting over the same combination. Only the last grabbed one runs, the others are reached solely when it returns `false` – which is usually a bug, not an intention.

```javascript
console.table(wh.getConflicts()) // [{combination: "Alt+c", hotkeys: [Hotkey, Hotkey]}]
```

Set the [`warnConflicts`](options.md#warnconflicts) option to have every such `grab` warned about right away.

## `onMiss`

See [Options: onMiss](options.md#onmiss) - called when a keystroke matched no hotkey, handy while debugging what the page actually receives.
