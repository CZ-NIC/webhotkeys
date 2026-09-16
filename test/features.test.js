// Regression tests for the 0.10 features (sequences, Mod+, destroy, remapping, aliases...).
// Same approach as group.test.js: load the browser script into a vm with a tiny DOM stub.
'use strict'

const vm = require('vm')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

// WH_FILE lets the very same tests run against the minified build (see `npm run test:min`)
const code = fs.readFileSync(path.join(__dirname, '..', process.env.WH_FILE || 'src/WebHotkeys.js'), 'utf8')

/** A DOM stub rich enough for the keydown machinery (no rendering, no real events). */
function loadWebHotkeys() {
    class FakeHTMLElement {
        constructor(tagName = "DIV") {
            this.tagName = tagName
            this.dataset = {}
            this.title = ""
            this.innerText = ""
            this.clicked = 0
            this.focused = 0
        }
        click() { this.clicked++ }
        focus() { this.focused++ }
        getAttribute() { return null }
        closest() { return null }
        contains(el) { return el === this }
    }
    const listeners = []
    const sandbox = {
        document: {
            currentScript: null, // skip the data-register auto-instantiation
            activeElement: null,
            querySelectorAll: () => [],
            addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
            removeEventListener: (type, fn) => {
                const i = listeners.findIndex(l => l.fn === fn)
                if (i > -1) { listeners.splice(i, 1) }
            },
        },
        MutationObserver: class { observe() { } disconnect() { } },
        HTMLElement: FakeHTMLElement,
        setTimeout, clearTimeout,
        localStorage: new class {
            constructor() { this.data = {} }
            getItem(key) { return this.data[key] ?? null }
            setItem(key, value) { this.data[key] = String(value) }
        },
        console,
    }
    vm.createContext(sandbox)
    vm.runInContext(code + '\nthis.__exports = { WebHotkeys, Hotkey }', sandbox)
    return { ...sandbox.__exports, sandbox, listeners, FakeHTMLElement }
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

/** The sequence recording ends by a pause, so it cannot be checked synchronously. */
function testAsync(name, fn) {
    return fn().then(() => console.log(`ok - ${name}`), e => {
        console.error(`not ok - ${name}`)
        console.error(e)
        process.exitCode = 1
    })
}

const { WebHotkeys, sandbox, listeners, FakeHTMLElement } = loadWebHotkeys()
// remap: false by default, otherwise every instance would pick up what a previous test stored
const OPTS = { helpKey: null, hintKey: null, observe: false, replaceAccesskeys: false, mac: false, remap: false }
const fresh = (extra = {}) => new WebHotkeys({ ...OPTS, ...extra })
/** A real keydown (unlike `simulate`, it goes through the document listeners, `record` included). */
const dispatch = e => listeners.filter(l => l.type === "keydown")
    .forEach(l => l.fn({ preventDefault() { }, stopPropagation() { }, ...e }))

//
// Key sequences
//

test('a sequence fires only after the whole prefix has been typed', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("g i", "Go to issues", () => fired++)

    wh.simulate("i") // the last key alone must not fire
    assert.strictEqual(fired, 0)

    wh.simulate("g i")
    assert.strictEqual(fired, 1)
})

test('an unrelated key in between breaks the sequence', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("g i", "Go to issues", () => fired++)
    wh.simulate("g")
    wh.simulate("x")
    wh.simulate("i")
    assert.strictEqual(fired, 0)
})

test('a sequence expires after sequenceTimeout', () => {
    const wh = fresh({ sequenceTimeout: 0 })
    let fired = 0
    wh.grab("g i", "Go", () => fired++)
    wh.simulate("g")
    wh._buffer.forEach(entry => entry.time -= 10) // pretend the keystroke is old
    wh.simulate("i")
    assert.strictEqual(fired, 0)
})

test('a lone modifier can form a double tap ("Shift Shift")', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("Shift Shift", "Search everywhere", () => fired++)
    wh.simulate({ key: "Shift", shiftKey: true })
    assert.strictEqual(fired, 0)
    wh.simulate({ key: "Shift", shiftKey: true })
    assert.strictEqual(fired, 1)
})

test('the prefix key of a pending sequence is swallowed', () => {
    const wh = fresh()
    wh.grab("g i", "Go", () => { })
    let prevented = 0
    wh._trigger({ key: "g", preventDefault: () => prevented++, stopPropagation: () => { } })
    assert.strictEqual(prevented, 1, "the pending 'g' must not reach the page")
})

test('a longer sequence does not block the plain hotkey of its last key', () => {
    const wh = fresh()
    const hits = []
    wh.grab("g i", "Sequence", () => hits.push("sequence"))
    wh.grab("i", "Plain", () => hits.push("plain"))
    wh.simulate("i")
    wh.simulate("g i")
    assert.deepStrictEqual(hits, ["plain", "sequence"])
})

test('a plain hotkey does not shadow a longer sequence starting with the same key', () => {
    const wh = fresh()
    const hits = []
    wh.grab("z", "Plain", () => hits.push("plain"))
    wh.grab("z x", "Sequence", () => hits.push("sequence"))
    wh.simulate("z")
    wh.simulate("x")
    assert.deepStrictEqual(hits, ["sequence"], "the sequence must win, the plain 'z' must not fire early")
})

test('an unrelated key breaks the shadowed prefix, firing the plain hotkey right away', () => {
    const wh = fresh()
    const hits = []
    wh.grab("z", "Plain", () => hits.push("plain"))
    wh.grab("z x", "Sequence", () => hits.push("sequence"))
    let missed = null
    wh.options.onMiss = e => missed = e.key
    wh.simulate("z")
    wh.simulate("y")
    assert.deepStrictEqual(hits, ["plain"])
    assert.strictEqual(missed, "y", "'y' itself is still reported as a miss")
})

testAsync('a shadowed plain hotkey fires after sequenceTimeout if nothing continues it', async () => {
    const wh = fresh({ sequenceTimeout: 20 })
    const hits = []
    wh.grab("z", "Plain", () => hits.push("plain"))
    wh.grab("z x", "Sequence", () => hits.push("sequence"))
    wh.simulate("z")
    assert.deepStrictEqual(hits, [], "must wait, not fire immediately")
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.deepStrictEqual(hits, ["plain"])
    wh.destroy() // this instance would otherwise keep listening on the shared `document` forever
})

test('warnConflicts warns when a plain hotkey and a longer sequence share their start', () => {
    const wh = fresh({ warnConflicts: true })
    const warnings = []
    const originalWarn = console.warn
    console.warn = (...args) => warnings.push(args.join(" "))
    try {
        wh.grab("z x", "Sequence", () => { })
        wh.grab("z", "Plain", () => { })
    } finally {
        console.warn = originalWarn
    }
    assert.ok(warnings.some(w => w.includes("shadows the sequence")), warnings.join("\n"))
})

//
// Modifiers, platform, aliases
//

test('"Mod+" resolves to Ctrl off a Mac and to Meta on a Mac', () => {
    assert.strictEqual(fresh({ mac: false }).grab("Mod+s", "Save", () => { }).combination, "Ctrl+s")
    assert.strictEqual(fresh({ mac: true }).grab("Mod+s", "Save", () => { }).combination, "Meta+s")
})

test('the clue uses the Apple symbols on a Mac only', () => {
    assert.strictEqual(fresh({ mac: true }).grab("Ctrl+Shift+Mod+k", "X", () => { }).clue, "⌃⌥⇧⌘k".replace("⌥", ""))
    assert.strictEqual(fresh({ mac: false }).grab("Ctrl+Shift+k", "X", () => { }).clue, "Ctrl+Shift+k")
})

test('metaKey is part of the clue (used to be dropped)', () => {
    assert.strictEqual(fresh().grab("Meta+k", "X", () => { }).clue, "Meta+k")
})

test('friendly spellings: Return, Esc, Up', () => {
    const wh = fresh()
    assert.strictEqual(wh.grab("Return", "X", () => { }).combination, "Enter")
    assert.strictEqual(wh.grab("Esc", "X", () => { }).combination, "Escape")
    assert.strictEqual(wh.grab("Alt+Up", "X", () => { }).combination, "Alt+ArrowUp")
})

test('the numpad falls back to the main row, unless claimed explicitly', () => {
    const wh = fresh()
    const hits = []
    wh.grab("Digit1", "Main row", () => hits.push("digit"))
    wh.simulate({ code: "Numpad1", key: "1" })
    assert.deepStrictEqual(hits, ["digit"], "Numpad1 must fall back to Digit1")

    wh.grab("Numpad1", "Numpad", () => hits.push("numpad"))
    wh.simulate({ code: "Numpad1", key: "1" })
    assert.deepStrictEqual(hits, ["digit", "numpad"], "an explicit numpad hotkey wins")
})

test('simulate() of a code-only event does not throw (no `key` property)', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("Shift+Digit1", "X", () => fired++)
    assert.doesNotThrow(() => wh.simulate({ shiftKey: true, code: "Digit1" }))
    assert.strictEqual(fired, 1)
})

test('simulate() fills in the missing key/code, so a text field blocks it like a real keystroke', () => {
    const wh = fresh()
    const hits = []
    wh.grab("Escape", "Close", () => hits.push("escape"))
    wh.grab("ArrowDown", "Next", () => hits.push("arrowdown"))
    wh.grab("Enter", "Submit", () => hits.push("enter"))

    sandbox.document.activeElement = Object.assign(new FakeHTMLElement("INPUT"), { type: "text" })
    wh.simulate("Escape")
    wh.simulate("ArrowDown")
    wh.simulate("Enter")
    sandbox.document.activeElement = null
    assert.deepStrictEqual(hits, ["escape"], "ArrowDown/Enter are text editing keys, Escape is not")
})

//
// Text fields
//

test('a plain letter is ignored while typing, unless {inInput: true}', () => {
    const wh = fresh()
    const hits = []
    wh.grab("f", "Plain", () => hits.push("plain"))
    wh.grab("Escape", "Close", () => hits.push("escape"), { inInput: true })

    sandbox.document.activeElement = Object.assign(new FakeHTMLElement("INPUT"), { type: "text" })
    wh.simulate("f")
    wh.simulate("Escape")
    sandbox.document.activeElement = null
    assert.deepStrictEqual(hits, ["escape"])
})

test('{inInput: true} unlocks ArrowDown in a text field, plain ArrowDown does not', () => {
    const wh = fresh()
    const hits = []
    wh.grab("ArrowDown", "Plain", () => hits.push("plain"))
    wh.grab("ArrowDown", "Combo", () => hits.push("combo"), { scope: "#combo", inInput: true })

    sandbox.document.activeElement = Object.assign(new FakeHTMLElement("INPUT"), { type: "text" })
    sandbox.document.activeElement.closest = selector => selector === "#combo" ? sandbox.document.activeElement : null
    wh.simulate("ArrowDown")
    sandbox.document.activeElement = null
    assert.deepStrictEqual(hits, ["combo"])
})

test('the `ignore` option switches the hotkeys off entirely', () => {
    let fired = 0
    const wh = fresh({ ignore: (active) => active?.tagName === "TEXTAREA" })
    wh.grab("Alt+f", "X", () => fired++)
    sandbox.document.activeElement = new FakeHTMLElement("TEXTAREA")
    wh.simulate("Alt+f")
    sandbox.document.activeElement = null
    assert.strictEqual(fired, 0)
    wh.simulate("Alt+f")
    assert.strictEqual(fired, 1)
})

test('activeElement() pierces the shadow DOM', () => {
    const wh = fresh()
    const inner = new FakeHTMLElement("INPUT")
    sandbox.document.activeElement = Object.assign(new FakeHTMLElement("MY-WIDGET"), { shadowRoot: { activeElement: inner } })
    assert.strictEqual(wh.activeElement(), inner)
    sandbox.document.activeElement = null
})

//
// Elements
//

test('a hidden element does not swallow its hotkey', () => {
    const wh = fresh()
    let fallback = 0
    const el = new FakeHTMLElement("BUTTON")
    el.getClientRects = () => []
    el.offsetWidth = el.offsetHeight = 0
    wh.grab("Alt+h", "Hidden button", el)
    wh.grab("Alt+h", "Fallback", () => fallback++)
    wh.simulate("Alt+h")
    assert.strictEqual(el.clicked, 0)
    assert.strictEqual(fallback, 1)
})

const hiddenEl = () => Object.assign(new FakeHTMLElement("BUTTON"), {
    getClientRects: () => [], offsetWidth: 0, offsetHeight: 0
})

test('the inHidden option lets a hidden element keep its hotkey', () => {
    const wh = fresh({ inHidden: true })
    const el = hiddenEl()
    let fallback = 0
    wh.grab("Alt+h", "Fallback", () => fallback++)
    wh.grab("Alt+h", "Hidden button", el) // the latest grab is tried first
    wh.simulate("Alt+h")
    assert.strictEqual(el.clicked, 1, "the button is a mere affordance of the hotkey, not a gate")
    assert.strictEqual(fallback, 0)
})

test('inHidden is overridable per hotkey, both ways', () => {
    const wh = fresh({ inHidden: true })
    const strict = hiddenEl()
    const lenient = hiddenEl()
    wh.grab("Alt+h", "Strict", strict, { inHidden: false })
    wh.grab("Alt+j", "Lenient", lenient)
    wh.simulate("Alt+h")
    wh.simulate("Alt+j")
    assert.strictEqual(strict.clicked, 0)
    assert.strictEqual(lenient.clicked, 1)

    const off = fresh({ inHidden: false })
    const el = hiddenEl()
    off.grab("Alt+k", "Opted in", el, { inHidden: true })
    off.simulate("Alt+k")
    assert.strictEqual(el.clicked, 1)
})

test('a disabled element is skipped even with inHidden', () => {
    const wh = fresh({ inHidden: true })
    const el = Object.assign(hiddenEl(), { disabled: true })
    let fallback = 0
    wh.grab("Alt+h", "Fallback", () => fallback++)
    wh.grab("Alt+h", "Disabled", el)
    wh.simulate("Alt+h")
    assert.strictEqual(el.clicked, 0)
    assert.strictEqual(fallback, 1, "disabled still means 'not now'")
})

//
// Displacing
//

test('displace() moves the hotkey behind a modifier and back', () => {
    const wh = fresh()
    let seeks = 0
    const hotkey = wh.grab("Digit1", "Seek to 10 %", () => seeks++)

    hotkey.displace("Shift")
    assert.strictEqual(hotkey.combination, "Shift+1")
    wh._trigger({ key: "1", code: "Digit1", preventDefault() { }, stopPropagation() { } })
    assert.strictEqual(seeks, 0, "the bare key is free now")
    wh._trigger({ key: "!", code: "Digit1", shiftKey: true, preventDefault() { }, stopPropagation() { } })
    assert.strictEqual(seeks, 1)

    hotkey.displace(null)
    assert.strictEqual(hotkey.combination, "1")
    wh.simulate({ key: "1", code: "Digit1" })
    assert.strictEqual(seeks, 2)
})

test('displacing is not a remapping', () => {
    const wh = fresh({ remap: true })
    const hotkey = wh.grab("Digit1", "Seek", () => { })
    hotkey.displace("Shift")
    assert.deepEqual(wh.remapping(), {}, "the user has not changed anything")
    assert.strictEqual(sandbox.localStorage.getItem("webhotkeys.remap"), null)
})

test('displace() respects what the user remapped and returns there', () => {
    const wh = fresh()
    const hotkey = wh.grab("Digit1", "Seek", () => { })
    hotkey.rebind("KeyQ") // the user's own choice
    hotkey.displace("Alt")
    assert.strictEqual(hotkey.combination, "Alt+KeyQ")
    hotkey.displace(null)
    assert.strictEqual(hotkey.combination, "KeyQ", "not back to the default, back to the user's")
})

test('a hotkey already holding the modifier stays where it is', () => {
    const wh = fresh()
    const rotate = wh.grab("Shift+r", "Rotate left", () => { })
    rotate.displace("Shift")
    assert.strictEqual(rotate.combination, "Shift+r", "prefixing would only collide with a neighbour")
    rotate.displace(null)
    assert.strictEqual(rotate.combination, "Shift+r")
})

test('displace() prefixes the entry key of a sequence and is idempotent', () => {
    const wh = fresh()
    const hotkey = wh.grab("g i", "Go to issues", () => { })
    hotkey.displace("Alt").displace("Alt")
    assert.strictEqual(hotkey.combination, "Alt+g i")
    hotkey.displace(null)
    assert.strictEqual(hotkey.combination, "g i")
})

test('a group displaces as a whole, a filtered part on its own', () => {
    const wh = fresh()
    const group = wh.group("Media", [
        ["Digit1", "Seek to 10 %", () => { }],
        ["Digit2", "Seek to 20 %", () => { }],
        ["KeyR", "Rotate", () => { }],
    ])
    group.filter(h => h.hint.startsWith("Seek")).displace("Shift")
    assert.deepEqual(group.map(h => h.combination), ["Shift+1", "Shift+2", "KeyR"])
    group.displace(null)
    assert.deepEqual(group.map(h => h.combination), ["1", "2", "KeyR"])
})

test('a user remapping while displaced becomes the new base', () => {
    const wh = fresh()
    const hotkey = wh.grab("Digit1", "Seek", () => { })
    hotkey.displace("Shift")
    hotkey.rebind("KeyQ") // the user picks a combination in the help dialog
    assert.strictEqual(hotkey.combination, "KeyQ")
    hotkey.displace("Shift")
    assert.strictEqual(hotkey.combination, "Shift+KeyQ")
})

test('displace() warns and does nothing when given something else than a modifier', () => {
    const wh = fresh()
    const hotkey = wh.grab("Digit1", "Seek", () => { })
    const warns = []
    const original = console.warn
    console.warn = msg => warns.push(msg)
    try {
        hotkey.displace("Banana")
    } finally {
        console.warn = original
    }
    assert.strictEqual(hotkey.combination, "1")
    assert.strictEqual(warns.length, 1)
})

test('a submit button is clicked, not merely focused', () => {
    const wh = fresh()
    const submit = Object.assign(new FakeHTMLElement("INPUT"), { type: "submit" })
    wh.grab("Alt+s", "Save", submit)
    wh.simulate("Alt+s")
    assert.strictEqual(submit.clicked, 1, "focusing a submit button would leave the form unsent")
    assert.strictEqual(submit.focused, 0)
})

test('a text input is focused, a checkbox clicked', () => {
    const wh = fresh()
    const text = Object.assign(new FakeHTMLElement("INPUT"), { type: "text" })
    const check = Object.assign(new FakeHTMLElement("INPUT"), { type: "checkbox" })
    wh.grab("Alt+t", "Text", text)
    wh.grab("Alt+k", "Check", check)
    wh.simulate("Alt+t")
    wh.simulate("Alt+k")
    assert.strictEqual(text.focused, 1)
    assert.strictEqual(text.clicked, 0)
    assert.strictEqual(check.clicked, 1)
    assert.strictEqual(check.focused, 0)
})

test('a radio is clicked and focused, so the arrows may go on within the group', () => {
    const wh = fresh()
    const radio = Object.assign(new FakeHTMLElement("INPUT"), { type: "radio" })
    wh.grab("Alt+r", "Medium", radio)
    wh.simulate("Alt+r")
    assert.strictEqual(radio.clicked, 1, "a mere focus does not check the radio")
    assert.strictEqual(radio.focused, 1, "the synthetic click() does not move the focus on its own")
})

test('a DETAILS opens by default - clicking it would do nothing', () => {
    const wh = fresh()
    const details = Object.assign(new FakeHTMLElement("DETAILS"), { open: false })
    wh.grab("Alt+d", "Details", details)
    wh.simulate("Alt+d")
    assert.strictEqual(details.open, true)
    assert.strictEqual(details.clicked, 0, "the native toggle sits on the SUMMARY, click() on the DETAILS is a no-op")
    wh.simulate("Alt+d")
    assert.strictEqual(details.open, false)
})

test('a focused radio does not swallow the letter hotkeys', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("j", "Down", () => fired++)
    sandbox.document.activeElement = Object.assign(new FakeHTMLElement("INPUT"), { type: "radio" })
    wh.simulate("j")
    assert.strictEqual(fired, 1, "a radio is no text field, it must not stand for a typing context")
    sandbox.document.activeElement = Object.assign(new FakeHTMLElement("INPUT"), { type: "text" })
    wh.simulate("j")
    assert.strictEqual(fired, 1, "a real text field still holds the letter back")
    sandbox.document.activeElement = null
})

test('[data-hotkey-action] overrides click/focus', () => {
    const wh = fresh()
    const input = Object.assign(new FakeHTMLElement("INPUT"), { type: "text" })
    input.getAttribute = name => name === "data-hotkey-action" ? "click" : null
    wh.grab("Alt+i", "Submit", input)
    wh.simulate("Alt+i")
    assert.strictEqual(input.clicked, 1)
    assert.strictEqual(input.focused, 0, "the [data-hotkey-action] must beat the default focus")
})

//
// Lifecycle
//

test('destroy() detaches the listener and forgets the hotkeys', () => {
    const before = listeners.length
    const wh = fresh()
    wh.grab("Alt+q", "X", () => { })
    assert.strictEqual(listeners.length, before + 1)
    wh.destroy()
    assert.strictEqual(listeners.length, before, "the keydown listener must be gone")
    assert.strictEqual(wh.getHotkeys().length, 0)
})

test('remove() forgets the hotkey, disable() only silences it', () => {
    const wh = fresh()
    const group = wh.group("G", [["Alt+a", "A", () => { }], ["Alt+b", "B", () => { }]])
    group[0].disable()
    assert.strictEqual(wh.getHotkeys(false).length, 2)
    group[0].remove()
    assert.strictEqual(wh.getHotkeys(false).length, 1)
    assert.strictEqual(group.length, 1, "the group must not keep the removed hotkey")
})

//
// Introspection, remapping
//

test('getConflicts() reports the scope-less duplicates only', () => {
    const wh = fresh()
    wh.grab("Alt+c", "First", () => { })
    wh.grab("Alt+d", "Alone", () => { })
    assert.strictEqual(wh.getConflicts().length, 0)
    wh.grab("Alt+c", "Second", () => { })
    wh.grab("Alt+d", "Scoped", () => { }, "#dialog")
    const conflicts = wh.getConflicts()
    assert.strictEqual(conflicts.length, 1)
    assert.strictEqual(conflicts[0].combination, "Alt+c")
})

test('rebind() moves the hotkey and keeps its original combination for remapping()', () => {
    const wh = fresh()
    let fired = 0
    const hotkey = wh.grab("Alt+r", "Reload", () => fired++)
    hotkey.rebind("Alt+t")
    wh.simulate("Alt+r")
    assert.strictEqual(fired, 0, "the old combination must be free")
    wh.simulate("Alt+t")
    assert.strictEqual(fired, 1)
    assert.deepEqual(wh.remapping(), { "Alt+r": "Alt+t" })
})

test('remapping(map) restores the user changes', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("Alt+r", "Reload", () => fired++)
    wh.remapping({ "Alt+r": "Alt+u" })
    wh.simulate("Alt+u")
    assert.strictEqual(fired, 1)
})

test('record() hands over the definition string of the next keystroke', () => {
    const wh = fresh()
    let recorded = null
    wh.record(combination => recorded = combination)
    dispatch({ key: "Shift", shiftKey: true }) // a lone modifier is not a combination
    assert.strictEqual(recorded, null)
    dispatch({ key: "J", code: "KeyJ", ctrlKey: true, shiftKey: true })
    assert.strictEqual(recorded, "Ctrl+Shift+J")
})

test('rebind() with no argument puts the hotkey back where it was', () => {
    const wh = fresh()
    let fired = 0
    const hotkey = wh.grab("Alt+r", "Reload", () => fired++)
    hotkey.rebind("Alt+t").rebind()
    wh.simulate("Alt+r")
    assert.strictEqual(fired, 1)
    assert.deepEqual(wh.remapping(), {}, "back to the default = not a remapping any more")
})

test('remapping(map) is the full state - what is missing goes back to the default', () => {
    const wh = fresh()
    let fired = 0
    const hotkey = wh.grab("Alt+r", "Reload", () => fired++)
    hotkey.rebind("Alt+u")
    wh.remapping({})
    assert.strictEqual(hotkey.combination, "Alt+r")
    wh.simulate("Alt+r")
    assert.strictEqual(fired, 1)
})

test('a hotkey grabbed later is remapped as well', () => {
    const wh = fresh()
    wh.remapping({ "Alt+r": "Alt+u" }) // ex: loaded from the server before the view mounted
    let fired = 0
    const hotkey = wh.grab("Alt+r", "Reload", () => fired++)
    assert.strictEqual(hotkey.combination, "Alt+u")
    wh.simulate("Alt+u")
    assert.strictEqual(fired, 1)
})

test('onRemap reports every user change, localStorage keeps it', () => {
    const seen = []
    const wh = fresh({ remap: "test-app", onRemap: map => seen.push(map) })
    wh.grab("Alt+r", "Reload", () => { })
    wh.getHotkeys()[0].rebind("Alt+t")
    assert.deepEqual(seen, [{ "Alt+r": "Alt+t" }])
    assert.strictEqual(sandbox.localStorage.getItem("test-app"), '{"Alt+r":"Alt+t"}')

    const next = fresh({ remap: "test-app" }) // a new page load
    let fired = 0
    next.grab("Alt+r", "Reload", () => fired++)
    next.simulate("Alt+t")
    assert.strictEqual(fired, 1, "the stored layout survived")
})

test('the page hotkeys stay silent while recording', () => {
    const wh = fresh()
    let fired = 0
    wh.grab("Alt+q", "Quit", () => fired++)
    let recorded = null
    wh.record(combination => recorded = combination)
    dispatch({ key: "q", code: "KeyQ", altKey: true })
    assert.strictEqual(fired, 0)
    assert.strictEqual(recorded, "Alt+q")
})

//
// Callbacks and help
//

test('onTrigger / onMiss are called', () => {
    const seen = []
    const wh = fresh({ onTrigger: hotkey => seen.push("trigger:" + hotkey.hint), onMiss: () => seen.push("miss") })
    wh.grab("Alt+o", "Opened", () => { })
    wh.simulate("Alt+o")
    wh.simulate("Alt+p")
    assert.deepStrictEqual(seen, ["trigger:Opened", "miss"])
})

test('getGroups() / getText() keep the ungrouped hotkeys first', () => {
    const wh = fresh()
    wh.grab("Alt+1", "Lonely", () => { })
    wh.group("Nav", [["Alt+2", "Next", () => { }]])
    assert.deepEqual(wh.getGroups().map(g => g.name), ["", "Nav"])
    assert.strictEqual(wh.getText(), "Alt+1: Lonely\n\n**Nav**\nAlt+2: Next")
})

// Left last on purpose: the recording outlives the synchronous tests below it.
test('a foreign value under our key is never overwritten', () => {
    sandbox.localStorage.setItem("taken", '{"user": {"name": "Edvard"}}') // the page's own data
    const wh = fresh({ remap: "taken" })
    wh.grab("Alt+r", "Reload", () => { })
    wh.getHotkeys()[0].rebind("Alt+t")
    assert.strictEqual(sandbox.localStorage.getItem("taken"), '{"user": {"name": "Edvard"}}', "left intact")
    assert.strictEqual(wh.getHotkeys()[0].combination, "Alt+t", "the remapping itself still works")
})

test('a remapping that is not a key combination is dropped, not hinted', () => {
    // The map comes from the outside (localStorage, the server) and lands in the element hint,
    // which is innerHTML under the `hint: "text"` option.
    const wh = fresh({ hint: "text" })
    const el = new FakeHTMLElement()
    el.innerHTML = "Save"
    const hotkey = wh.grab("Alt+s", "Save", el)
    wh.remapping({ "Alt+s": "<img src=x onerror=alert(1)>" })
    assert.strictEqual(hotkey.combination, "Alt+s", "left where it was")
    assert.ok(!el.innerHTML.includes("<img"), `no markup got in: ${el.innerHTML}`)
    assert.deepEqual(wh.remapping(), {})

    wh.remapping({ "Alt+s": "Ctrl+Shift+ArrowUp" }) // a legitimate one still passes
    assert.strictEqual(hotkey.combination, "Ctrl+Shift+ArrowUp")
})

test('the default storage key is a dotted one', () => {
    const wh = fresh({ remap: true })
    wh.grab("Alt+r", "Reload", () => { })
    wh.getHotkeys()[0].rebind("Alt+t")
    assert.strictEqual(sandbox.localStorage.getItem("webhotkeys.remap"), '{"Alt+r":"Alt+t"}')
})

testAsync('record({sequence: true}) collects the keystrokes until the user pauses', async () => {
    const wh = fresh({ sequenceTimeout: 20 })
    const progress = []
    let recorded = null
    wh.record(combination => recorded = combination, { sequence: true, onProgress: p => progress.push(p) })
    dispatch({ key: "g", code: "KeyG" })
    dispatch({ key: "i", code: "KeyI" })
    assert.strictEqual(recorded, null, "still waiting for more keys")
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.strictEqual(recorded, "g i")
    assert.deepEqual(progress, ["g", "g i"])
})
