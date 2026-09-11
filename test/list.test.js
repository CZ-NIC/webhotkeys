// Smoke test for `list()`: it must NOT be a singleton - two calls must produce two independent
// instances, each configurable and destroyable on its own, and `scope` must keep their arrow keys
// from fighting over the same keystroke.
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
    /** Descendant combinator support (".listA li"), space-separated simple selectors. */
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
    isSameNode(other) { return this === other }
}

function buildList(className, count) {
    const container = new FakeElement("div", className)
    const items = []
    for (let i = 0; i < count; i++) {
        items.push(container.appendChild(new FakeElement("li")))
    }
    return { container, items }
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

test('two wh.list() calls return two independent instances, not the same one reconfigured', () => {
    activeElement = null
    const root = new FakeElement("div")
    const { container: c1, items: items1 } = buildList("listA", 2)
    const { container: c2, items: items2 } = buildList("listB", 2)
    root.appendChild(c1)
    root.appendChild(c2)
    const { WebHotkeys } = loadWebHotkeys(root)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })

    const list1 = wh.list(".listA li")
    const list2 = wh.list(".listB li")
    assert.notStrictEqual(list1, list2, "list() must not cache a singleton")

    items1[0].focus()
    list1.goNext()
    assert.strictEqual(activeElement, items1[1], "list1 navigates its own items")

    items2[0].focus()
    list2.goNext()
    assert.strictEqual(activeElement, items2[1], "list2, configured independently, still works")

    wh.destroy()
})

test('scope keeps two lists\' arrow keys from fighting over the same keystroke', () => {
    activeElement = null
    const root = new FakeElement("div")
    const { container: c1, items: items1 } = buildList("listA", 2)
    const { container: c2, items: items2 } = buildList("listB", 2)
    root.appendChild(c1)
    root.appendChild(c2)
    const { WebHotkeys, listeners } = loadWebHotkeys(root)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })

    wh.list(".listA li", { upDown: true, scope: ".listA" })
    wh.list(".listB li", { upDown: true, scope: ".listB" })

    const dispatch = key => listeners.filter(l => l.type === "keydown")
        .forEach(l => l.fn({ key, code: key, preventDefault() { }, stopPropagation() { } }))

    items1[0].focus()
    dispatch("ArrowDown")
    assert.strictEqual(activeElement, items1[1], "the keystroke reached the scoped list under focus")
    assert.notStrictEqual(activeElement, items2[0], "the other list's selection is untouched")

    wh.destroy()
})

test('list.destroy() detaches only that instance, leaving the other list grabbed', () => {
    activeElement = null
    const root = new FakeElement("div")
    const { container: c1, items: items1 } = buildList("listA", 2)
    const { container: c2, items: items2 } = buildList("listB", 2)
    root.appendChild(c1)
    root.appendChild(c2)
    const { WebHotkeys, listeners } = loadWebHotkeys(root)
    const wh = new WebHotkeys({ observe: false, helpKey: null, hintKey: null })

    const list1 = wh.list(".listA li", { upDown: true, scope: ".listA" })
    wh.list(".listB li", { upDown: true, scope: ".listB" })
    list1.destroy()

    const dispatch = key => listeners.filter(l => l.type === "keydown")
        .forEach(l => l.fn({ key, code: key, preventDefault() { }, stopPropagation() { } }))

    items1[0].focus()
    dispatch("ArrowDown")
    assert.strictEqual(activeElement, items1[0], "list1 was destroyed, ArrowUp/Down no longer bound to it")

    items2[0].focus()
    dispatch("ArrowDown")
    assert.strictEqual(activeElement, items2[1], "list2 is still working")

    wh.destroy()
})
