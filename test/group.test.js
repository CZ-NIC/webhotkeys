// Minimal dependency-free regression test (Node, no browser).
// WebHotkeys.js is a plain browser script (no module.exports), so we load it into a
// vm context with a tiny DOM stub, just enough to construct a WebHotkeys instance.
'use strict'

const vm = require('vm')
const fs = require('fs')
const path = require('path')
const assert = require('assert')

// WH_FILE lets the very same tests run against the minified build (see `npm run test:min`)
const code = fs.readFileSync(path.join(__dirname, '..', process.env.WH_FILE || 'src/WebHotkeys.js'), 'utf8')

function loadWebHotkeys() {
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
    vm.createContext(sandbox)
    vm.runInContext(code + '\nthis.__exports = { WebHotkeys }', sandbox)
    return sandbox.__exports.WebHotkeys
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

const WebHotkeys = loadWebHotkeys()

test('group named "constructor" returns a usable HotkeyGroup, not Object', () => {
    const wh = new WebHotkeys({ observe: false, replaceAccesskeys: false })
    const group = wh.group('constructor')
    assert.strictEqual(typeof group.push, 'function', 'group("constructor") must be a HotkeyGroup with .push()')
    assert.doesNotThrow(() => group.push('x'))
})

test('group named "__proto__" does not corrupt the _groups registry prototype', () => {
    const wh = new WebHotkeys({ observe: false, replaceAccesskeys: false })
    const protoBefore = Object.getPrototypeOf(wh._groups)
    wh.group('__proto__')
    assert.strictEqual(Object.getPrototypeOf(wh._groups), protoBefore, '_groups prototype must stay unchanged')
    // and a normal, unrelated group must still work afterwards
    const other = wh.group('Global shortcuts')
    assert.strictEqual(typeof other.push, 'function')
})

test('disabling an already-disabled hotkey does not remove a foreign hotkey sharing the combination', () => {
    const wh = new WebHotkeys({ observe: false, replaceAccesskeys: false })
    const a = wh.grab('Ctrl+k', 'A', () => { })
    const b = wh.grab('Ctrl+k', 'B', () => { }) // same KeyState bucket as `a`
    a.disable()
    a.disable() // double-disable must be a no-op, not splice out `b`
    assert.strictEqual(b.enabled, true, '`b` must still be enabled')
    assert.ok(wh._hotkeys[b.key_state].includes(b), '`b` must still be registered')
})
