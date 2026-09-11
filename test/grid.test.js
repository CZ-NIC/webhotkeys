// Smoke test for the 2D `grid()` helper: row/column arithmetic, wrap behaviour, and that two
// independent grid() instances (two tables on the same page) don't fight over the arrow keys.
'use strict'

const vm = require('vm')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

// WH_FILE lets the very same tests run against the minified build (see `npm run test:min`)
const code = fs.readFileSync(path.join(__dirname, '..', process.env.WH_FILE || 'src/WebHotkeys.js'), 'utf8')

let activeElement = null

class FakeElement {
    constructor(tagName, className = "") {
        this.tagName = tagName.toUpperCase()
        this.className = className
        this.children = []
        this.parent = null
        this.style = {}
    }
    appendChild(child) {
        this.children.push(child)
        child.parent = this
        return child
    }
    /** Supports a bare tag, a bare `.class`, or `tag.class` - enough for these tests. */
    matches(selector) {
        if (selector === ":focus") { return activeElement === this }
        const m = selector.match(/^([a-zA-Z]*)(\.[\w-]+)?$/)
        if (!m) { return false }
        const [, tag, cls] = m
        if (tag && this.tagName !== tag.toUpperCase()) { return false }
        if (cls && !this.className.split(" ").includes(cls.slice(1))) { return false }
        return true
    }
    /** Descendant combinator support ("table.t1 tr"), space-separated simple selectors. */
    querySelectorAll(selector) {
        let candidates = [this]
        for (const part of selector.trim().split(/\s+/)) {
            const next = []
            const walk = node => node.children.forEach(child => {
                if (child.matches(part)) { next.push(child) }
                walk(child)
            })
            candidates.forEach(walk)
            candidates = next
        }
        return candidates
    }
    closest(selector) {
        let el = this
        while (el) {
            if (el.matches(selector)) { return el }
            el = el.parent
        }
        return null
    }
    getAttribute() { return null }
    scrollIntoView() { }
    focus() { activeElement = this }
}

function buildTable(className, rows, cols) {
    const table = new FakeElement("table", className)
    const trs = []
    for (let r = 0; r < rows; r++) {
        const tr = table.appendChild(new FakeElement("tr"))
        trs.push(tr)
        for (let c = 0; c < cols; c++) {
            tr.appendChild(new FakeElement("td"))
        }
    }
    return { table, trs }
}

function loadWebHotkeys(root) {
    const listeners = []
    const sandbox = {
        document: {
            currentScript: null,
            get activeElement() { return activeElement },
            querySelectorAll: selector => root.querySelectorAll(selector),
            addEventListener: (type, fn) => listeners.push({ type, fn }),
            removeEventListener: (type, fn) => {
                const i = listeners.findIndex(l => l.fn === fn)
                if (i > -1) { listeners.splice(i, 1) }
            },
        },
        window: { addEventListener: () => { }, removeEventListener: () => { } },
        MutationObserver: class { observe() { } disconnect() { } },
        HTMLElement: FakeElement,
        setTimeout, clearTimeout,
        console,
    }
    vm.createContext(sandbox)
    vm.runInContext(code + '\nthis.__exports = { WebHotkeys }', sandbox)
    return { WebHotkeys: sandbox.__exports.WebHotkeys, listeners }
}

function test(name, fn) {
    try {
        fn()
        console.log(`ok - ${name}`)
    } catch (e) {
        console.error(`not ok - ${name}`)
        console.error(e)
        process.exitCode = 1
    }
}

test('goDown/goUp keep the column, goLeft/goRight move within the row', () => {
    activeElement = null
    const { table, trs } = buildTable("t", 3, 2)
    const { WebHotkeys } = loadWebHotkeys(table)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })
    const grid = wh.grid("tr", "td")
    trs[0].children[0].focus() // row 0, col 0

    grid.goDown()
    assert.strictEqual(activeElement, trs[1].children[0], "goDown keeps the column")
    grid.goRight()
    assert.strictEqual(activeElement, trs[1].children[1], "goRight moves within the row")
    grid.goUp()
    assert.strictEqual(activeElement, trs[0].children[1], "goUp keeps the (new) column")
    grid.goLeft()
    assert.strictEqual(activeElement, trs[0].children[0], "goLeft moves back within the row")

    grid.destroy()
    wh.destroy()
})

test('without wrap, the edges just stop moving', () => {
    activeElement = null
    const { table, trs } = buildTable("t", 2, 2)
    const { WebHotkeys } = loadWebHotkeys(table)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })
    const grid = wh.grid("tr", "td")
    trs[0].children[0].focus()

    grid.goUp() // already at the first row
    assert.strictEqual(activeElement, trs[0].children[0])
    grid.goLeft() // already at the first column
    assert.strictEqual(activeElement, trs[0].children[0])

    grid.destroy()
    wh.destroy()
})

test('wrap: true loops around row and column edges', () => {
    activeElement = null
    const { table, trs } = buildTable("t", 2, 2)
    const { WebHotkeys } = loadWebHotkeys(table)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })
    const grid = wh.grid("tr", "td", { wrap: true })
    trs[0].children[0].focus()

    grid.goUp()
    assert.strictEqual(activeElement, trs[1].children[0], "wraps to the last row")
    grid.goLeft()
    assert.strictEqual(activeElement, trs[1].children[1], "wraps to the last column")

    grid.destroy()
    wh.destroy()
})

test('two independent grid() instances (two tables) do not steal each other\'s arrow keys', () => {
    activeElement = null
    const root = new FakeElement("div")
    const { table: t1, trs: rows1 } = buildTable("t1", 2, 2)
    const { table: t2, trs: rows2 } = buildTable("t2", 2, 2)
    root.appendChild(t1)
    root.appendChild(t2)
    const { WebHotkeys, listeners } = loadWebHotkeys(root)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })

    const grid1 = wh.grid("table.t1 tr", "td", { scope: "table.t1" })
    const grid2 = wh.grid("table.t2 tr", "td", { scope: "table.t2" })

    rows1[0].children[0].focus()
    const dispatch = key => listeners.filter(l => l.type === "keydown")
        .forEach(l => l.fn({ key, code: "Arrow" + key.replace("Arrow", ""), preventDefault() { }, stopPropagation() { } }))
    dispatch("ArrowDown")

    assert.strictEqual(activeElement, rows1[1].children[0], "table 1 reacted to the keystroke")
    assert.notStrictEqual(activeElement, rows2[0].children[0], "table 2's selection is untouched")

    grid1.destroy()
    grid2.destroy()
    wh.destroy()
})
