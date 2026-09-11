// Regression test: WebHotkeys.js must stay require()-able from plain Node (no `document` at all)
// while remaining a valid classic <script> (that path is covered by test/group.test.js's vm stub).
'use strict'

const assert = require('assert')
const path = require('path')

const FILE = path.join(__dirname, '..', process.env.WH_FILE || 'src/WebHotkeys.js')

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

test('require()-ing the file does not throw despite no `document` global', () => {
    assert.doesNotThrow(() => require(FILE))
})

test('module.exports exposes WebHotkeys as the default export plus named classes', () => {
    const WebHotkeys = require(FILE)
    assert.strictEqual(typeof WebHotkeys, 'function')
    assert.strictEqual(WebHotkeys.WebHotkeys, WebHotkeys)
    assert.strictEqual(typeof WebHotkeys.Hotkey, 'function')
    assert.strictEqual(typeof WebHotkeys.HotkeyGroup, 'function')
})
