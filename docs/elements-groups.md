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

### Method `displace`
*return this*

Move the hotkey behind a modifier for as long as something else needs its bare combination - a mode
of your application that takes the digits over, an editor that wants the plain letters. Called with
no argument, the hotkey goes back where it sat.

```javascript
seek.displace("Shift")  // 'Digit1' -> 'Shift+Digit1' while the tagging mode owns the digits
seek.displace()         // back
```

Unlike [`rebind`](#method-rebind), this is your doing, not the user's: it never enters the
[remapping](help-remapping.md#method-remapping), and the hotkey returns to whatever the user
currently has it on, not to the factory default. A `rebind` in the meantime wins - the combination
the user has just picked becomes the base the next `displace` prefixes.

Only the first combination of a sequence is prefixed (`g i` -> `Alt+g i`) - that is the one clashing.
A hotkey already holding the modifier stays where it is, so displacing a whole group never turns
`Shift+r` into `Shift+Shift+r` nor collides it with its own `r`.

### Property `allowHidden`

Fire even when the linked element is hidden. `null` (the default) inherits the
[`inHidden`](options.md#inhidden) option; `grab(..., {inHidden: true})` sets it for a single hotkey.

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

### Method `displace`
*return this*

Put every hotkey of the group behind a modifier, `null` puts them back. @see [`Hotkey.displace`](#method-displace)

A group is an `Array`, so a part of it displaces on its own:

```javascript
media.displace("Shift")                                  // the whole group
media.filter(h => h.hint.startsWith("Seek")).displace("Shift")  // just the clashing ones
```

### Method `remove`
*return this*

Forget all the hotkeys in the group.
