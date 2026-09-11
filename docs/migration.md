# Migration

## 0.9.0 to 1.0.0

Two defaults changed:

* `F1` opens a modal dialog instead of an `alert`. Set `{help: "alert"}` to get the old behaviour back.
* A hotkey linked to a **hidden** element (`display: none`, `[hidden]`, `[inert]`) no longer fires; the next hotkey sharing the combination is tried instead.

And the API grew a `helpKey`/`hintKey`/remapping layer, plus a cleanup of a few methods added along the way that never shipped in a release:

| Old | New |
|-----|-----|
| `<script src="...?register">` | `<script data-register>` |
| `grab(hotkey, action)` | `grab(hotkey, hint, action)` - `hint` is now a mandatory 2nd parameter |
| `{selector, selectorGroup, selectorAction}` | `{attribute, groupAttribute, actionAttribute}` |
| `grabF1: false` | `helpKey: null` |
| `grabF1: true` (default) | `helpKey: 'F1'` (default) |
| `hintKey: null` (default) | `hintKey: 'F2'` (default) |
| `showHelp()` / `hideHelp()` | `toggleHelp(true)` / `toggleHelp(false)` |
| `showHints()` / `hideHints()` | `toggleHints(true)` / `toggleHints(false)` |
| `wh.getRemapping()` | `wh.remapping()` |
| `wh.applyRemapping(map)` | `wh.remapping(map)` |
| `wh.persistRemapping(storageKey)` | `{remap: storageKey}` constructor option |
| `hotkey.allowInInput()` | `grab(hotkey, hint, action, {inInput: true})` (or `{scope, inInput: true}`) |
| `hotkey.getClue()` | `hotkey.clue` |
| `hotkey.getCombination()` | `hotkey.combination` |
| `hotkey.getText()` | `hotkey.text` |
| `wh.insertCss(...)` | removed (was only ever needed internally by `list()`) |
| `wh.list(query, currentSelector, changeFn, handleUpDown)` | `wh.list(query, {current, onChange, upDown})` |
| `list.setQuery(q)` | `wh.list(q)` |
| `list.setCurrentSelector(s)` | `wh.list(query, {current: s})` |
| `list.setChangeFn(fn)` | `wh.list(query, {onChange: fn})` |
| `list.setCallback(fn)` | `wh.list(query, {onChanged: fn})` |
| `list.setWrap(bool)` | `wh.list(query, {wrap: bool})` |
| `list.setScroll(bool)` | `wh.list(query, {scroll: bool})` |
| `list.handleUpDown()` | `wh.list(query, {upDown: true})` |
| `list.handleHomeEnd()` | `wh.list(query, {homeEnd: true})` |
| `list.handleTypeahead(ms)` | `wh.list(query, {typeahead: ms})` |
| `list.getCurrent()` / `list.setCurrent(el)` | `list.current` getter/setter |

## Migrate from 0.7 to 0.8

```
KEY\.N(\d), "Digit\L$1",
KEY\.([A-Z]\w+), "\L$1",
KEY\.([A-Z]), "\L$1"
wh\.press\( wh.grab(
wh\.pressAlt\(" wh.grab("Alt+
removed get_info_pairs()
```
