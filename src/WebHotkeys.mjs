// ESM entry point for the npm package. The library itself is WebHotkeys.js - a single classic
// browser script - so we only re-export its CommonJS bindings under the ESM names here.
// (Keep in sync with the module.exports block at the bottom of WebHotkeys.js.)
import WebHotkeysDefault from "./WebHotkeys.js"

export const WebHotkeys = WebHotkeysDefault
export const Hotkey = WebHotkeysDefault.Hotkey
export const HotkeyGroup = WebHotkeysDefault.HotkeyGroup
export default WebHotkeysDefault
