// Regression test: the package must be importable as a real ESM module too
// (the `exports` map points `import` to WebHotkeys.mjs).
import assert from 'assert'
import WebHotkeys, { WebHotkeys as Named, Hotkey, HotkeyGroup } from '../src/WebHotkeys.mjs'

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

test('the ESM default export is the WebHotkeys class', () => {
    assert.strictEqual(typeof WebHotkeys, 'function')
    assert.strictEqual(WebHotkeys.name, 'WebHotkeys')
})

test('the named exports are there as well', () => {
    assert.strictEqual(Named, WebHotkeys)
    assert.strictEqual(typeof Hotkey, 'function')
    assert.strictEqual(typeof HotkeyGroup, 'function')
})
