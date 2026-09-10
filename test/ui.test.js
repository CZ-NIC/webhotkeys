// Smoke test of the help dialog and the hint badges. The DOM stub is bigger here than in the
// other test files (createElement, a real element tree), but still nowhere near a browser -
// it only proves the code runs and builds what it should. Rendering must be checked by hand.
'use strict'

const vm = require('vm')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

// WH_FILE lets the very same tests run against the minified build (see `npm run test:min`)
const code = fs.readFileSync(path.join(__dirname, '..', process.env.WH_FILE || 'WebHotkeys.js'), 'utf8')

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName.toUpperCase()
        this.children = []
        this.style = {}
        this.dataset = {}
        this.className = ""
        this.title = ""
        this.innerText = ""
        this._text = ""
    }
    /** The real textContent aggregates the subtree - the help filter relies on that. */
    get textContent() { return this._text + this.children.map(c => c.textContent).join(" ") }
    set textContent(value) { this._text = value }
    appendChild(child) { this.children.push(child); return child }
    remove() { this.removed = true }
    querySelectorAll(selector) {
        const out = []
        const walk = node => node.children.forEach(child => {
            if ("." + child.className === selector) { out.push(child) }
            walk(child)
        })
        walk(this)
        return out
    }
    addEventListener() { }
    showModal() { this.open = true }
    close() { this.open = false }
    getBoundingClientRect() { return { left: 10, top: 20, width: 100, height: 30 } }
    checkVisibility() { return true }
    closest() { return null }
    click() { this.clicked = true }
    focus() { this.focused = (this.focused || 0) + 1 }
}

function loadWebHotkeys() {
    const listeners = []
    const head = new FakeElement("head")
    const body = new FakeElement("body")
    const sandbox = {
        document: {
            currentScript: null, activeElement: null, head, body,
            createElement: tag => new FakeElement(tag),
            querySelectorAll: () => [],
            addEventListener: (type, fn) => listeners.push({ type, fn }),
            removeEventListener: (type, fn) => {
                const i = listeners.findIndex(l => l.fn === fn)
                if (i > -1) { listeners.splice(i, 1) }
            },
        },
        window: { scrollX: 0, scrollY: 0, addEventListener: () => { }, removeEventListener: () => { } },
        MutationObserver: class { observe() { } disconnect() { } },
        HTMLElement: FakeElement,
        setTimeout, clearTimeout,
        console,
    }
    vm.createContext(sandbox)
    vm.runInContext(code + '\nthis.__exports = { WebHotkeys }', sandbox)
    return { WebHotkeys: sandbox.__exports.WebHotkeys, head, body, listeners }
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

const { WebHotkeys, head, body, listeners } = loadWebHotkeys()
/** A real keydown, the way `record` receives it. */
const dispatch = e => listeners.filter(l => l.type === "keydown")
    .forEach(l => l.fn({ preventDefault() { }, stopPropagation() { }, ...e }))
const build = () => {
    // a short sequenceTimeout: the recording commits once the user stops typing
    const wh = new WebHotkeys({ observe: false, replaceAccesskeys: false, mac: false, sequenceTimeout: 20 })
    wh.grab("Alt+1", "První", () => { })
    wh.group("Nav", [["Alt+2", "Druhá", () => { }]])
    return wh
}

test('toggleHelp(true) builds a row per hotkey and a heading per group', () => {
    const wh = build()
    wh.toggleHelp(true)
    assert.strictEqual(wh._help.open, true)
    assert.strictEqual(wh._help.querySelectorAll(".webhotkeys-row").length, 4) // F1 + F2 + the two above
    wh.destroy()
})

test('the help filter hides the non-matching rows', () => {
    const wh = build()
    wh.toggleHelp(true)
    const filter = wh._help.children[0].children[1]
    filter.value = "druh"
    filter.oninput()
    const hidden = wh._help.querySelectorAll(".webhotkeys-row").filter(row => row.style.display === "none")
    assert.strictEqual(hidden.length, 3, "only the matching row stays visible")
    wh.destroy()
})

test('Escape closes the help and the page hotkeys stay silent meanwhile', () => {
    const wh = build()
    let fired = 0
    wh.grab("Alt+3", "Třetí", () => fired++)
    wh.toggleHelp(true)
    wh.simulate("Alt+3")
    assert.strictEqual(fired, 0, "the dialog swallows the page hotkeys")
    wh.simulate("Escape")
    assert.strictEqual(wh._help, null)
    wh.simulate("Alt+3")
    assert.strictEqual(fired, 1)
    wh.destroy()
})

test('toggleHints(true) badges the elements only, positioned absolutely', () => {
    const wh = build()
    const button = new FakeElement("button")
    wh.grab("Alt+b", "Tlačítko", button)
    wh.toggleHints(true)
    assert.strictEqual(wh._hints.children.length, 1, "a callback hotkey has no element to badge")
    assert.strictEqual(wh._hints.children[0].textContent, "Alt+b")
    assert.strictEqual(wh._hints.children[0].style.left, "10px")
    wh.toggleHints()
    assert.strictEqual(wh._hints, null)
    wh.destroy()
})

test('destroy() takes the injected style away', () => {
    const wh = build()
    wh.toggleHelp(true)
    const style = wh._style
    assert.ok(head.children.includes(style))
    wh.destroy()
    assert.strictEqual(style.removed, true)
    assert.strictEqual(body.children.every(child => !child.open), true)
})

//
// Remapping right in the help dialog. Recording ends by a pause, hence asynchronous - and strictly
// sequential, so that a leftover recording does not eat the keystrokes of the next test.
//

/** The row of the given hint: [the combination button, the hint, the reset button]. */
const findRow = (wh, hint) => wh._help.querySelectorAll(".webhotkeys-row")
    .find(row => row.children[1].textContent === hint)
const settle = () => new Promise(resolve => setTimeout(resolve, 40)) // > sequenceTimeout

async function testAsync(name, fn) {
    try {
        await fn()
        console.log(`ok - ${name}`)
    } catch (e) {
        console.error(`not ok - ${name}`)
        console.error(e)
        process.exitCode = 1
    }
}

testAsync('clicking the combination records the new one and rebinds the hotkey', async () => {
    const wh = build()
    let fired = 0
    wh.grab("Alt+3", "Třetí", () => fired++)
    wh.toggleHelp(true)
    const [key, , reset] = findRow(wh, "Třetí").children

    key.onclick()
    assert.strictEqual(key.textContent, "…", "waiting for the keystroke")
    dispatch({ key: "j", code: "KeyJ", ctrlKey: true })
    assert.strictEqual(key.textContent, "Ctrl+j …", "shown live, a sequence may still continue")
    await settle()
    assert.strictEqual(key.textContent, "Ctrl+j")
    assert.strictEqual(reset.style.display, "", "the reset button showed up")
    assert.ok(key.focused, "the focus stays on the combination just changed")

    wh.toggleHelp(false)
    wh.simulate("Alt+3")
    assert.strictEqual(fired, 0, "the default combination is free now")
    wh.simulate("Ctrl+j")
    assert.strictEqual(fired, 1)
    wh.destroy()
})
    .then(() => testAsync('a whole sequence can be recorded, not just a single combination', async () => {
        const wh = build()
        let fired = 0
        wh.grab("Alt+3", "Třetí", () => fired++)
        wh.toggleHelp(true)
        const [key] = findRow(wh, "Třetí").children
        key.onclick()
        dispatch({ key: "g", code: "KeyG" })
        dispatch({ key: "i", code: "KeyI" })
        await settle()
        assert.strictEqual(key.textContent, "g i")
        wh.toggleHelp(false)
        wh.simulate("g i")
        assert.strictEqual(fired, 1)
        wh.destroy()
    }))
    .then(() => testAsync('Escape cancels the recording, it neither rebinds nor closes the dialog', async () => {
        const wh = build()
        wh.toggleHelp(true)
        const [key] = findRow(wh, "První").children
        key.onclick()
        dispatch({ key: "Escape", code: "Escape" })
        assert.strictEqual(key.textContent, "Alt+1", "unchanged")
        assert.ok(wh._help, "the dialog stays open")
        assert.strictEqual(wh._recording, null, "cancelled at once, no waiting for the pause")
        wh.destroy()
    }))
    .then(() => testAsync('the reset button puts the default combination back', async () => {
        const wh = build()
        wh.toggleHelp(true)
        const [key, , reset] = findRow(wh, "První").children
        key.onclick()
        dispatch({ key: "u", code: "KeyU", altKey: true })
        await settle()
        assert.strictEqual(key.textContent, "Alt+u")
        reset.onclick()
        assert.strictEqual(key.textContent, "Alt+1")
        assert.strictEqual(reset.style.display, "none")
        assert.ok(key.focused, "the reset button is gone now, the focus moved to the combination")
        assert.deepEqual(wh.remapping(), {})
        wh.destroy()
    }))
    .then(() => testAsync('remapping onto a taken combination marks the row', async () => {
        const wh = build()
        wh.toggleHelp(true)
        const row = findRow(wh, "První")
        row.children[0].onclick()
        dispatch({ key: "2", code: "Digit2", altKey: true }) // "Druhá" holds Alt+2
        await settle()
        assert.ok(row.className.includes("webhotkeys-clash"))
        assert.ok(row.children[0].title.includes("Druhá"))
        wh.destroy()
    }))

test('remap: false keeps the plain, non-clickable list', () => {
    const wh = new WebHotkeys({ observe: false, replaceAccesskeys: false, mac: false, remap: false })
    wh.grab("Alt+1", "První", () => { })
    wh.toggleHelp(true)
    const row = wh._help.querySelectorAll(".webhotkeys-row")[1]
    assert.strictEqual(row.children[0].tagName, "KBD")
    assert.strictEqual(row.children.length, 2, "no reset button")
    wh.destroy()
})
