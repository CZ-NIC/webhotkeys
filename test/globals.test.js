// Regression test: a classic <script> tag exposes window.WebHotkeys/Hotkey/HotkeyGroup (a
// top-level `class` is lexically scoped, so it never becomes a window property on its own -
// see WebHotkeys.js's `else if (typeof window !== "undefined")` block), while the require()/vm
// path (module.exports present) never touches `window` at all.
'use strict'

const vm = require('vm')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

const code = fs.readFileSync(path.join(__dirname, '..', process.env.WH_FILE || 'src/WebHotkeys.js'), 'utf8')

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

test('the <script> path exposes window.WebHotkeys/Hotkey/HotkeyGroup as constructors', () => {
    class FakeHTMLElement { }
    const sandbox = {
        document: {
            currentScript: null, // skip the data-register auto-instantiation
            querySelectorAll: () => [],
            addEventListener: () => { },
        },
        MutationObserver: class { observe() { } },
        HTMLElement: FakeHTMLElement,
        console,
    }
    sandbox.window = sandbox // a real browser's `window` is the global object itself
    vm.createContext(sandbox)
    vm.runInContext(code, sandbox)

    assert.strictEqual(typeof sandbox.window.WebHotkeys, 'function')
    assert.strictEqual(typeof sandbox.window.Hotkey, 'function')
    assert.strictEqual(typeof sandbox.window.HotkeyGroup, 'function')
    assert.doesNotThrow(() => new sandbox.window.WebHotkeys({ observe: false, replaceAccesskeys: false }))
})

test('the require()/module.exports path never touches `window`', () => {
    const FILE = path.join(__dirname, '..', process.env.WH_FILE || 'src/WebHotkeys.js')
    delete require.cache[require.resolve(FILE)]
    assert.strictEqual(typeof global.window, 'undefined')
    require(FILE)
    assert.strictEqual(typeof global.window, 'undefined', 'requiring the file must not create a global `window`')
})
