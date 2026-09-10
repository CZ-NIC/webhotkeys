# Elements & groups

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

### Property `allowInput`

By default a hotkey does not fire while the user is typing into an input or a `contenteditable` (see the [text guard](hotkeys.md#method-grab)). Pass `{inInput: true}` as the [`grab`](hotkeys.md#method-grab) scope parameter to opt a hotkey out of the rule, or set the property directly:

```javascript
wh.grab("Escape", "Close", close, { inInput: true })
wh.grab("Ctrl+Enter", "Send", send, { inInput: true })
myHotkey.allowInput = true
```

### Method `rebind`
*return this*

Move the hotkey to another combination. The hint in the element `title` is rewritten accordingly and the original combination is remembered for the [remapping](help-remapping.md#method-remapping). Called with no argument, the hotkey goes back to its default combination.

```javascript
myHotkey.rebind("Ctrl+j")
myHotkey.rebind()  // back to the original
```

### Property `clue`
*string*

Hotkey combination for the text representation. On a Mac, the Apple symbols are used (`⌘⇧k`).

### Property `combination`
*string*

The platform independent definition string – what you would pass to `grab` to get the very same combination.

### Property `text`
*string*

`"Ctrl+k: Hint text"`

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
