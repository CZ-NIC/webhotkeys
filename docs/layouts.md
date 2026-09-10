# Keyboard layouts

Whether a hotkey survives a keyboard layout switch depends on which of the two forms you used – and that is decided by the length of the key name.

* **A multi-character name is a `code`** – the *physical position* of the key, independent of the layout. `KeyF` means the key that a US QWERTY prints `F` on, whatever the current layout prints there.
* **A single character is a `key`** – the *character produced*, hence layout dependent. `"f"` fires whenever the keystroke produces an `f`.

Both slots are checked on every keystroke (the `code` first), so a hotkey may be grabbed both ways at once.

| definition | Czech QWERTZ | English QWERTY |
|---|---|---|
| `"KeyF"` | ✔ the `f` key | ✔ the `f` key |
| `"f"` | ✔ | ✔ |
| `"KeyZ"` | ⚠ the key printed `y` | the key printed `z` |
| `"z"` | ⚠ the key printed `z` (physically where QWERTY has `y`) | the key printed `z` |
| `"Digit1"` | ✔ | ✔ |
| `"1"` | ⚠ needs `Shift` (the bare key gives `+`) | ✔ |
| `"?"` | ✔ | ✔ |
| `"ř"` | ✔ | ✘ never fires |

Three consequences worth remembering:

* **QWERTZ swaps `y` and `z`.** A `code` is a position, not a character: `KeyZ` is the key labelled `y` on a Czech or German keyboard. For plain letters the `key` form is usually the intuitive one; for digits and punctuation it is the other way round.
* **Digits are shifted on many layouts.** The Czech top row types `ěščřžýáíé` unshifted. `"Digit1"` (a code, no modifier) catches the plain keystroke there; `"1"` (a key) would need `Shift`, and `Shift+1` no longer matches `"Digit1"`, because the Shift state is part of a `code` combination.
* **Punctuation ignores `Shift`.** For a single character that is not a letter, the Shift state is not compared at all – so `"?"` works on both layouts although the physical combination differs. (And a single upper-case letter is normalised to lower case: `"Shift+Alt+l"` and `"Shift+Alt+L"` are the same hotkey.)

Hence the rules of thumb:

* navigation-ish letter hotkeys (`j`, `k`, `g i`) – use the character, it lands on the same place on most latin layouts,
* digits, `Enter`, function keys and anything positional (`WASD`) – use the `code` (`"KeyW"`, `"Digit1"`),
* a character your layout does not have is simply unreachable, so grab both forms if you need it:

```javascript
wh.grab("ř", "Hint", action)       // Czech keyboard
wh.grab("Digit5", "Hint", action)  // the same physical key anywhere else
```

There is deliberately no automatic translation between layouts (`ř` → `5`): it would need the author's layout declared, a database of layouts, dead-key and AltGr handling, and the browser API telling us the user's current layout ([`navigator.keyboard.getLayoutMap()`](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap)) exists in Chromium only. Grabbing the `code` gives the same result deterministically, everywhere.

Whatever you pick, the user has the last word: they may [remap](help-remapping.md#method-remapping) any hotkey in the help dialog and the choice is kept in their `localStorage`.
