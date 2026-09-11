# List helper

`wh.list(query, options)` turns any set of elements into a keyboard navigable list (a menu, a table, a track listing). Every call returns its **own independent instance** - several lists can coexist on the same page, as long as each gets a distinct `scope` so their arrow/Home/End keys don't fight over the focus. `wh.destroy()` detaches every list created this way; destroy a single one earlier with `list.destroy()`.

```javascript
const list = wh.list("ul#tracks li", {
    current: ".active", css: "{background: gold}", // ':focus' by default
    wrap: true,       // the last item continues at the first one
    upDown: true,     // bind ArrowUp / ArrowDown
    homeEnd: true,    // bind Home / End
    typeahead: true,  // type the first letters of an item to select it
    scope: "#tracks", // restrict the arrow keys to this list
})

list.goNext()
list.current
```

| Option | Description |
|--------|-------------|
| `current` (`':focus'`), `css` | The selector marking the current item, and CSS to highlight it. |
| `wrap` (`false`) | Jump from the last item to the first one and back. |
| `scroll` (`true`) | Scroll the selected item into the view. |
| `onChange` | Called with `(newEl, oldEl)` before the change; returning `false` cancels it. |
| `onChanged` | Called with `(newEl)` once the change has happened. |
| `upDown`, `homeEnd` (`false`) | Bind the usual listbox keys (ArrowUp/ArrowDown, Home/End). |
| `typeahead` (`false`/`800`) | Type an item's first letters to jump to it, like a native `<select>`. Keystrokes within `800` ms of each other accumulate into one prefix (a longer pause starts a new one); pass a number to use a different timeout. |
| `scope` | Restricts the `upDown`/`homeEnd` grabs, same as `grab`'s scope. |

| Method/property | Description |
|--------|-------------|
| `goNext`, `goPrev`, `goFirst`, `goLast`, `go(forward, steps)`, `selectByPrefix` | Move programmatically. |
| `current` | Getter/setter for the selected element. |
| `destroy` | Detach the typeahead listener and this instance's `upDown`/`homeEnd` grabs. |

## Grid helper

`wh.grid(rowQuery, cellQuery, options)` turns a table into a 2D keyboard-navigable grid: Up/Down move between rows while keeping the column, Left/Right move between cells of the current row. Every call returns its **own independent instance** - several tables can coexist on the same page, as long as each gets a distinct `scope` so their arrow keys don't fight over the focus.

```javascript
const rows = wh.grid("table.dbtable tr", "td", {
    scope: "table.dbtable", // restrict the arrow keys to this table
    wrap: true,             // the last row/column continues at the first one
})
```

| Option | Description |
|--------|-------------|
| `current` (`':focus'`) | The selector marking the current cell. |
| `wrap` (`false`) | Wrap around row/column edges instead of stopping there. |
| `scroll` (`true`) | Scroll the selected cell into the view. |
| `onChange` | Called with `(newEl, oldEl)` before the change; returning `false` cancels it. |
| `onChanged` | Called with `(newEl)` once the change has happened. |
| `scope` | Restricts the Up/Down/Left/Right grabs, same as `grab`'s scope. |

| Method | Description |
|--------|-------------|
| `go(rows, cols)` | Move programmatically: `go(1)` down, `go(-1)` up, `go(0, 1)` right, `go(1, -1)` down-left. |
| `destroy` | Detach the Up/Down/Left/Right grabs. |
