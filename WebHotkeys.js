/**
 * Default configuration options for Web Hotkeys.
 *
 * @typedef {Object} WebHotkeysDefaults
 * @property {string|boolean} [hint='title'] Values: 'title', 'text', false. Append shorcut text to the element title (ex: 'anchor (Alt+1)') or its text (or its label for the case of a form element).
 * @property {boolean} [grabF1=true] Put basic help text under F1
 * @property {string|boolean} [help='dialog'] Values: 'dialog', 'alert'. How the F1 help is displayed. The dialog falls back to the alert when the DOM is not available.
 * @property {?Key} [hintKey=null] Key combination that toggles the visual badges over all the elements having a hotkey. Ex: 'F2'.
 * @property {boolean} [replaceAccesskeys=true] If true, [accesskey] elements will be converted to hotkeys.
 * @property {boolean} [observe=true] Monitors DOM changes. Automatically un/grab hotkeys as DOM elements with the given selector dis/appear.
 * @property {?function} [onToggle]  When having a DOM element linked, run this callback on hotkey toggle. This will be set to the hotkey, first parameter being the element, second boolean whether it got enabled.
 * @property {?function} [onTrigger] Called after a hotkey fired, receives (hotkey, event). Handy for logging.
 * @property {?function} [onMiss] Called when a keystroke matched no hotkey, receives (event). Handy for debugging.
 * @property {string} [selector='data-hotkey']  Attribute name to link DOM elements to shorcuts.
 * @property {string} [selectorGroup='data-hotkey-group']  Attribute name to link DOM elements to shorcut groups.
 * @property {string} [selectorAction='data-hotkey-action']  Attribute name to override what happens with the element ('click', 'focus', 'toggle').
 * @property {?string|?function} [ignore=null]  Selector or callback(activeElement, event). When it matches, no hotkey is triggered at all.
 * @property {number} [sequenceTimeout=1000]  Milliseconds a key sequence ('g i') may be spread over. Also how long the F1 dialog waits before committing a recorded sequence.
 * @property {boolean|string} [remap=true]  The F1 dialog lets the user click a combination and press their own. A string is used as the localStorage key (true means 'webhotkeys.remap'), false turns the editing off.
 * @property {?function} [onRemap]  Called with the remapping object whenever the user changes a combination. Handy to store the layout on the server. @see getRemapping
 * @property {?boolean} [mac=null]  Display the combinations with the macOS symbols (⌘⌥⇧⌃) and resolve the 'Mod' modifier to Meta. Null means autodetect.
 * @property {boolean} [warnConflicts=false]  Console warn when a newly grabbed hotkey shadows an existing scope-less one.
 */
const WebHotkeysDefaults = {
    replaceAccesskeys: true, grabF1: true, help: "dialog", hintKey: null,
    selector: "data-hotkey", selectorGroup: "data-hotkey-group", selectorAction: "data-hotkey-action",
    observe: true, onToggle: null, onTrigger: null, onMiss: null, hint: "title",
    ignore: null, sequenceTimeout: 1000, mac: null, warnConflicts: false,
    remap: true, onRemap: null
}

/**
 * Like KeyboardEvent but does not have guaranteed to contain all info.
 * Ex: {"code": "Digit1", "altKey": true} (missing shiftKey)
 * @typedef {KeyboardEvent} KeyEvent
 */
/** Key combination. Either event.code "Digit1", event.key "1" or a combination with a modifier "Ctrl+Digit1".
 * Multiple combinations separated by a space form a sequence: "g i".
 * @typedef {string} Key
 */
/** @typedef {HTMLElement|Function} ResolvedAction An element or a callback function. */
/** @typedef {ResolvedAction|string} Action An element, its selector or a callback function. */
/**
 * Key letter combined with modifiers. Just because JS does not support tuple as a key dict.
 * @typedef {string} KeyState
 */
/**
 * Modifiers as a string. Just because JS does not support tuple as a key dict.
 * @typedef {string} ModState
 */

/** Where the user remapping goes. Dotted on purpose - the page shares the origin, it must not look like its own key. */
const DEFAULT_STORAGE_KEY = "webhotkeys.remap"

const FORM_TAGS = ["INPUT", "SELECT", "TEXTAREA"]
/** These fire a keydown of their own; a sequence step may consist of them only ('Shift Shift'). */
const MODIFIER_KEYS = ["Shift", "Alt", "Control", "Meta"]
/** Written in a hotkey definition -> the real KeyboardEvent.key of a lone modifier. */
const MODIFIER_ALIASES = { shift: "Shift", alt: "Alt", ctrl: "Control", control: "Control", meta: "Meta", cmd: "Meta", mod: "Mod" }
/** Convenience spellings accepted in a hotkey definition. */
const KEY_ALIASES = {
    return: "Enter", esc: "Escape", del: "Delete", ins: "Insert", space: "Space",
    up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight",
    pgup: "PageUp", pgdown: "PageDown", pgdn: "PageDown"
}
/**
 * Shadow codes. When no hotkey claims the pressed `code`, we look up its main-row counterpart,
 * so that a hotkey grabbed as 'Digit1' or 'Enter' fires from the numeric keypad too.
 * A hotkey explicitly grabbed for the numpad code always wins.
 */
const CODE_ALIASES = {
    NumpadEnter: "Enter", NumpadDecimal: "Period", NumpadDivide: "Slash", NumpadSubtract: "Minus", NumpadAdd: "Equal",
    Numpad0: "Digit0", Numpad1: "Digit1", Numpad2: "Digit2", Numpad3: "Digit3", Numpad4: "Digit4",
    Numpad5: "Digit5", Numpad6: "Digit6", Numpad7: "Digit7", Numpad8: "Digit8", Numpad9: "Digit9"
}
const MAC_SYMBOLS = { ctrl: "⌃", alt: "⌥", shift: "⇧", meta: "⌘" }

class Hotkey {
    /**
     *
     * @param {ResolvedAction} action
     * @param {string} hint
     * @param {Action} scope
     * @param {KeyEvent|KeyEvent[]} event Single combination or a sequence of them.
     * @param {WebHotkeys} wh
     */
    constructor(action, hint, scope, event, wh) {
        this.action = action
        this.hint = hint
        this.scope = scope
        /** @type {KeyEvent[]} The whole sequence. A plain hotkey is a sequence of a single combination. */
        this.sequence = Array.isArray(event) ? event : [event]
        /** @type {KeyEvent} The combination that actually triggers the hotkey (the last one of the sequence). */
        this.event = this.sequence[this.sequence.length - 1]
        this.wh = wh
        /** @type {boolean} Fire even when the user is typing into an input. @see allowInput */
        this.allowInput = false
        /** @type {string} The combination the hotkey was grabbed with. Survives `rebind`, hence remapping. */
        this.defaultCombination = this.getCombination()
        /** @type {?HTMLElement} The hotkey is linked to this DOM element. */
        const el = this.element = action instanceof HTMLElement ? action : null
        wh._all.add(this)
        this.enabled = this._enable() // do not emit onToggle on first enabling

        if (el) {
            if (!this.hint) {
                this.hint = el.title || el.innerText.substring(0, 50)
            }
            this._hintElement()
        }
    }

    /** Append the clue to the linked element (title / text), unless it is already there. */
    _hintElement(previousClue = null) {
        const el = this.element
        const opt = this.wh.options
        if (!el || !opt.hint) {
            return
        }
        const clue = this.getClue()
        // Stores *which* hotkey's clue was last hinted (not just a boolean), as a
        // data-* attribute so it survives el.cloneNode()/$.clone(). A clone kept
        // with the SAME hotkey (ex: zoom.js's `replace()` re-clones #nav-Close with
        // "Alt+z" on every zoom_refresh()) must not be re-hinted; but a clone given
        // a DIFFERENT hotkey (ex: free-text.js clones the submit button 3x, each
        // with its own Alt+Shift+… hotkey) still needs its own hint appended.
        if (el.dataset.webhotkeysDisplayed === clue) {
            return
        }
        const hint = ` (${clue})`
        const stale = previousClue ? ` (${previousClue})` : null // rebind: replace, do not append twice
        const rewrite = text => stale && text.includes(stale) ? text.replace(stale, hint) : text + hint
        if (opt.hint === "title") {
            el.title = rewrite(el.title || "")
        } else if (opt.hint === "text") {
            if (FORM_TAGS.includes(el.tagName)) {
                if (el.labels?.[0]?.innerHTML) {
                    el.labels[0].innerHTML = rewrite(el.labels[0].innerHTML)
                }
            } else {
                el.innerHTML = rewrite(el.innerHTML)
            }
        }
        el.dataset.webhotkeysDisplayed = clue
    }

    /**
    * Get hotkey combination for the text representation. Uses the macOS symbols when applicable.
    * @returns {string}
    */
    getClue(append_parenthesis = false) {
        const clue = this.sequence.map(e => Hotkey.comboText(e, this.wh?.isMac())).join(" ")
        return append_parenthesis ? ` (${clue})` : clue
    }

    /**
     * Get the canonical, platform independent definition string. `wh.grab(hotkey.getCombination(), …)`
     * grabs the very same combination. Unlike `getClue`, it never uses the macOS symbols.
     * @returns {Key}
     */
    getCombination() {
        return this.sequence.map(e => Hotkey.comboText(e, false)).join(" ")
    }

    /** Get text representation. */
    getText() {
        return `${this.getClue()}: ${this.hint}`
    }

    /**
     * Text form of a single combination.
     * @param {KeyEvent} e
     * @param {boolean} mac Use the macOS symbols.
     * @returns {string}
     */
    static comboText(e, mac = false) {
        const key = (e.key || e.code || "").replace(/^Digit(\d)$/, "$1") // 'Alt+Digit1' -> 'Alt+1'
        if (MODIFIER_KEYS.includes(key)) { // a lone modifier, ex: the 'Shift Shift' double tap
            return mac ? MAC_SYMBOLS[key === "Control" ? "ctrl" : key.toLowerCase()] : key
        }
        const mods = ["ctrl", "alt", "shift", "meta"].filter(m => e[m + "Key"])
        if (mac) {
            // Apple's canonical order, no separator
            return ["ctrl", "alt", "shift", "meta"].filter(m => e[m + "Key"]).map(m => MAC_SYMBOLS[m]).join("") + key
        }
        const order = { ctrl: "Ctrl+", shift: "Shift+", alt: "Alt+", meta: "Meta+" }
        return ["ctrl", "shift", "alt", "meta"].filter(m => mods.includes(m)).map(m => order[m]).join("") + key
    }

    /**
     * Build the definition string out of a real keystroke. @see WebHotkeys.record
     * @param {KeyEvent} e
     * @returns {Key}
     */
    static fromEvent(e) {
        if (MODIFIER_KEYS.includes(e.key)) {
            return e.key
        }
        return Hotkey.comboText({ ...pickModifiers(e), [e.key?.length === 1 ? "key" : "code"]: e.key?.length === 1 ? e.key : e.code })
    }

    /**
     * @returns {KeyState}
     */
    get key_state() {
        return (this.event.key || this.event.code) + Hotkey.mod_state(this.event)
    }

    /**
     * @returns {Hotkey[]}
     */
    get registry() {
        return this.wh._hotkeys[this.key_state] ||= []
    }

    /**
     *
     * @param {KeyEvent} e
     * @returns {ModState}
     */
    static mod_state(e, supress_shift = false) {
        // If there ever be a clash between key and code, we might put a list into storage
        // and compare hotkeys like this: [modifiers] = [{key: 1}, {code: Digit1}]
        return String((supress_shift ? 0 : e.shiftKey << 3) | e.altKey << 2 | e.ctrlKey << 1 | e.metaKey)
    }

    /**
     * Does a single combination describe the given keystroke?
     * @param {KeyEvent} spec A parsed combination.
     * @param {KeyEvent} e A real keystroke.
     * @returns {boolean}
     */
    static match(spec, e) {
        if (spec.code && spec.code !== e.code && CODE_ALIASES[e.code] !== spec.code) {
            return false
        }
        if (spec.key && !keyEquals(spec.key, e.key)) {
            return false
        }
        const oneChar = e.key?.length === 1
        return Hotkey.mod_state(spec, oneChar && !/[A-Za-z]/.test(e.key)) === Hotkey.mod_state(e, oneChar && !/[A-Za-z]/.test(e.key))
    }

    /** Fire even when the user is typing into an input or a contenteditable.
     * Ex: `wh.grab("Escape", "Close", close).allowInInput()`
     * @param {boolean} allow
     * @returns {Hotkey}
     */
    allowInInput(allow = true) {
        this.allowInput = allow
        return this
    }

    /**
     * Move the hotkey to another combination, ex. because the user remapped it.
     * @param {?Key} combination Nothing (or null) puts the hotkey back to its default combination.
     * @param {boolean} store Record the change in the remapping (and persist it). Internal use.
     * @returns {Hotkey}
     */
    rebind(combination = null, store = true) {
        const was = this.enabled
        const previousClue = this.getClue()
        this.disable()
        this.sequence = this.wh._parseSequence(combination || this.defaultCombination)
        this.event = this.sequence[this.sequence.length - 1]
        this._hintElement(previousClue)
        if (was) {
            this.enable()
        }
        if (store) {
            const current = this.getCombination()
            if (current === this.defaultCombination) {
                delete this.wh._remap[this.defaultCombination]
            } else {
                this.wh._remap[this.defaultCombination] = current
            }
            this.wh._saveRemapping()
        }
        return this
    }

    _enable() {
        if (!this.registry.includes(this)) {
            this.registry.unshift(this)
        }
        return this.enabled = true
    }
    enable() {
        this._enable()
        this._notify()
        return this
    }
    disable() {
        const index = this.registry.indexOf(this)
        if (index > -1) { // when already disabled, splice(-1, 1) would remove a foreign hotkey sharing the combination
            this.registry.splice(index, 1)
        }
        this.enabled = false
        this._notify()
        return this
    }
    /**
     * @param {?boolean} enable
     */
    toggle(enable = null) {
        enable === null && !this.enabled || enable ? this.enable() : this.disable()
        return this
    }

    /**
     * Unlike `disable`, this forgets the hotkey for good – it disappears from the groups,
     * from the help and the linked element can be grabbed again.
     * @returns {Hotkey}
     */
    remove() {
        this.disable()
        this.wh._all.delete(this)
        if (this.element && this.wh._dom.get(this.element) === this) {
            this.wh._dom.delete(this.element)
        }
        Object.values(this.wh._groups).forEach(group => {
            const index = group.indexOf(this)
            if (index > -1) {
                group.splice(index, 1)
            }
        })
        return this
    }

    _notify() {
        if (this.element && this.wh.options.onToggle) {
            this.wh.options.onToggle.call(this, this.action, this.enabled)
        }
    }
}

/**
 * @extends {Array<Hotkey>}
 */
class HotkeyGroup extends Array {
    enable() {
        return this.toggle(true)
    }
    disable() {
        return this.toggle(false)
    }
    /**
     * @param {?boolean} enable
     */
    toggle(enable = null) {
        this.forEach(hotkey => hotkey.toggle(enable))
        return this
    }
    /** Forget all the hotkeys of the group. @see Hotkey.remove */
    remove() {
        this.slice().forEach(hotkey => hotkey.remove())
        return this
    }
}

/**
 * Main interface to define hotkeys
 */
class WebHotkeys {

    /**
     * @param {WebHotkeysDefaults} options
     */
    constructor(options) {
        /** @type {WebHotkeysDefaults} */
        options = this.options = { ...WebHotkeysDefaults, ...options }
        /**  @type {Object.<KeyState, Hotkey[]>} */
        this._hotkeys = Object.create(null)
        /** @type {WeakMap.<HTMLElement, Hotkey>} Links DOM elements to its shorcuts. */
        this._dom = new WeakMap()
        /** @type {Set<Hotkey>} Every hotkey ever grabbed, the disabled ones included. */
        this._all = new Set()
        /** @type {{event: KeyEvent, time: number}[]} Recent keystrokes, the material for the key sequences. */
        this._buffer = []
        /**
         * @type {Object.<Key, Key>} The user changes (default combination -> the current one).
         * Kept as the single source of truth, not derived from the hotkeys: a remapping may well
         * concern a hotkey that is not grabbed yet (another SPA view), `grab` consults it.
         */
        this._remap = Object.create(null)
        /** @type {?function} Set while `record` waits for a keystroke; the hotkeys stay silent meanwhile. */
        this._recording = null

        // Object.create(null) (not {}) because the group name is an arbitrary string coming from
        // [data-hotkey-group] in the DOM. A group named e.g. "constructor" or "__proto__" would otherwise
        // collide with an inherited property, returning a builtin instead of a HotkeyGroup (crashing on
        // .push()) or clobbering the registry's own prototype.
        /**  @type {Object.<string, Hotkey[]>} */
        this._groups = Object.create(null)

        //
        // Helper methods
        //
        /**
         * @param {HTMLElement} el
         * @returns {boolean} Has [data-hotkey] attribute
         */
        const eligible = el => el.getAttribute?.(options.selector)?.length
        /** @param {HTMLElement} el Grab the element's [data-hotkey] attribute */
        // The user might pass a dynamically created element with [data-hotkey] to grab. In such case, MutationObserver will notify us
        // about the element when the original thread ceases. Thus, if we have not checked whether the element has already linked
        // the hotkey through the this._dom, it would be regrabbed and strange bugs would be produced. (Ex: double onToggle callback.)
        // const grab = el => !this._dom.has(el)&& this._dom.set(el, this.grab(el.getAttribute(options.selector), el.getAttribute("title"), el))
        const grab = el => !this._dom.has(el) && this.grab(el.getAttribute(options.selector), el.getAttribute("title"), el)

        //
        // Process options
        //
        if (options.remap) { // load the stored layout before anything gets grabbed
            this._storageKey = isString(options.remap) ? options.remap : DEFAULT_STORAGE_KEY
            this._loadRemapping()
        }
        if (options.replaceAccesskeys) {
            document.querySelectorAll("[accesskey]:not([accesskey=''])").forEach(el => {
                // if concurrent accesskeys exists, preventDefault of the WebHotkeys would make it to fire alongside the hotkey,
                // hence we transform accesskeys to hotkeys as well
                el.setAttribute(options.selector, "Alt+" + el.getAttribute("accesskey"))
                el.removeAttribute("accesskey")
            })
        }

        if (options.grabF1) {
            this.grab("F1", "Help", () => this.showHelp())
        }
        if (options.hintKey) {
            this.grab(options.hintKey, "Show the hotkeys over the page", () => this.toggleHints())
        }

        // Grabs all [data-hotkey] elements. Puts its title as a help text.
        document.querySelectorAll(`[${options.selector}]`).forEach(grab)

        if (options.observe) {
            // un/register hotkey on DOM change
            this._observer = new MutationObserver(mutationList => {
                for (const mutation of mutationList) {
                    if (mutation.type === "attributes") {
                        const el = mutation.target
                        this._dom.get(el)?.disable() && this._dom.delete(el) // old hotkey vanished
                        if (eligible(el)) { // new hotkey appeared
                            grab(el)
                        }
                    } else if (mutation.type === "childList") {
                        // Grab all the added nodes and their subtrees
                        [...Array.from(mutation.addedNodes).filter(eligible),
                        ...Array.from(mutation.addedNodes).map(el => Array.from(el.querySelectorAll?.(`[${options.selector}]`) || [])).flat()
                        ].forEach(grab); // ; needed
                        // Ungrab all the added nodes and their subtrees
                        [...Array.from(mutation.removedNodes).filter(eligible),
                        ...Array.from(mutation.removedNodes).map(el => Array.from(el.querySelectorAll?.(`[${options.selector}]`) || [])).flat()]
                            .forEach(el => this._dom.get(el).disable() && this._dom.delete(el))
                    }

                }
            })
            this._observer.observe(document, { attributeFilter: [options.selector], childList: true, subtree: true })
        }

        //
        // Start listening
        //
        this._listener = e => this._trigger(e)
        document.addEventListener("keydown", this._listener, true)
        return this
    }

    /**
     * @param {WebHotkeysDefaults} options
     */
    setOptions(options) {
        this.options = { ...this.options, ...options }
        return this
    }

    /**
     * Stop listening for good – detaches the keydown listener and the MutationObserver, forgets
     * every hotkey and removes the injected styles. Call it when a SPA view unmounts, otherwise
     * the instance keeps intercepting the whole document forever.
     * @returns {WebHotkeys}
     */
    destroy() {
        document.removeEventListener("keydown", this._listener, true)
        this._observer?.disconnect()
        this._recording?.()
        this.hideHelp()
        this.hideHints()
        this._list?.destroy()
        Array.from(this._all).forEach(hotkey => hotkey.remove())
        this._hotkeys = Object.create(null)
        this._groups = Object.create(null)
        this._dom = new WeakMap()
        this._buffer = []
        this._style?.remove?.()
        this._style = this._sheet = undefined
        this._destroyed = true
        return this
    }

    /** @returns {boolean} Should the combinations be rendered the Apple way (⌘⌥⇧⌃)? */
    isMac() {
        if (this.options.mac !== null && this.options.mac !== undefined) {
            return this.options.mac
        }
        const platform = typeof navigator !== "undefined"
            && (navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "")
        return /mac|iphone|ipad|ipod/i.test(platform || "")
    }

    /**
     * `document.activeElement` does not pierce the shadow DOM – this does, so that both the scope
     * and the "user is typing" detection work inside the web components.
     * @returns {?HTMLElement}
     */
    activeElement() {
        let el = document.activeElement
        while (el?.shadowRoot?.activeElement) {
            el = el.shadowRoot.activeElement
        }
        return el || null
    }

    /**
     * @param {boolean} enabledOnly
     * @returns {Hotkey[]}
     */
    getHotkeys(enabledOnly = true) {
        return Array.from(this._all).filter(hotkey => !enabledOnly || hotkey.enabled)
    }

    /**
     * Hotkeys structured for the help. The ungrouped ones come first, under an empty name.
     * @returns {{name: string, hotkeys: Hotkey[]}[]}
     */
    getGroups() {
        const enabled = new Set(this.getHotkeys())
        const seen = new Set()
        const grouped = Object.entries(this._groups).map(([name, group]) => {
            const hotkeys = group.filter(hotkey => enabled.has(hotkey))
            hotkeys.forEach(hotkey => seen.add(hotkey))
            return { name, hotkeys }
        }).filter(g => g.hotkeys.length) // if at least one hotkey from a group remains enabled

        const ungrouped = Array.from(enabled).filter(hotkey => !seen.has(hotkey))
        return [...(ungrouped.length ? [{ name: "", hotkeys: ungrouped }] : []), ...grouped]
    }

    /**
     * @returns {string} Help text to current hotkeys' map.
     */
    getText() {
        return this.getGroups()
            .map(({ name, hotkeys }) => (name ? `\n**${name}**\n` : "") + hotkeys.map(h => h.getText()).join("\n"))
            .join("\n").trim()
    }

    /**
     * Scope-less hotkeys fighting over the same combination. The last grabbed one wins,
     * the others are only reached when it returns false.
     * @returns {{combination: string, hotkeys: Hotkey[]}[]}
     */
    getConflicts() {
        const map = new Map()
        this.getHotkeys().filter(hotkey => !hotkey.scope).forEach(hotkey => {
            const key = hotkey.getCombination()
            map.set(key, [...(map.get(key) || []), hotkey])
        })
        return Array.from(map).filter(([, hotkeys]) => hotkeys.length > 1)
            .map(([combination, hotkeys]) => ({ combination, hotkeys }))
    }

    /**
     * .grab(hotkey, [hint], action, [scope])
     *
     * @param {Key} hotkey Key combination to be grabbed. Ex: 'Alt+a', 'Ctrl+PageDown', 'g i' (a sequence).
     * @param {string|Action} hintOrAction Either hint text or an action (if the action parameter stays undefined).
     * @param {Action} action  What will happen on hotkey trigger.
     *   If action returns false, hotkey will be treated as non-existent and event will propagate further.
     *   If action is a HTMLElement or its string selector, its click or focus method (form elements) is invoked instead.
     * @param {?Action} scope Scope within the hotkey is allowed to be launched.
     *  The scope can be an HTMLElement that the active element is being search under when the hotkey triggers.
     *  The scope can an HTMLElement selector, does not have to exist at the shorcut definition time.
     *  The scope can be a function, resolved at the keystroke time. True means the scope matches. That way, you can implement negative scope.
     *  (Ex: down arrow should work unless there is DialogOverlay in the document root.)
     * @returns {Hotkey}
     */
    grab(hotkey, hintOrAction, action, scope = null) {
        // juggle optional parameters
        if (action === undefined) {  // action parameter was not used - shift the others
            action = hintOrAction
            hintOrAction = ""
        }
        let error = !hotkey || !action
        if (isString(action)) {
            try {
                action = document.querySelector(action)
            } catch (e) {
                error = true
            }
        }
        if (error) {
            console.error(`WebHotkeys.js> Unknown action hotkey for action ${hotkey} ${action}`)
            return
        }
        // register hotkey and set the hint to the DOM
        const hotkeyO = new Hotkey(action, hintOrAction, scope, this._parseSequence(hotkey), this)

        // The user may have remapped this very combination in a previous session (or in another
        // view that has been unmounted since) – honour it right away, before anyone sees the hint.
        const remapped = this._remap[hotkeyO.defaultCombination]
        if (remapped && remapped !== hotkeyO.getCombination()) {
            hotkeyO.rebind(remapped, false)
        }

        const { element } = hotkeyO
        const { selectorGroup } = this.options
        if (element) {
            this._dom.set(element, hotkeyO)

            // register group
            const groupName = element.closest(`[${selectorGroup}]`)?.getAttribute(selectorGroup)
            if (groupName) {
                this.group(groupName).push(hotkeyO)
            }
        }
        if (this.options.warnConflicts) {
            const conflict = this.getConflicts().find(c => c.combination === hotkeyO.getCombination())
            if (conflict) {
                console.warn(`WebHotkeys.js> ${conflict.combination} is grabbed ${conflict.hotkeys.length}x:`,
                    conflict.hotkeys.map(h => h.hint || h.action))
            }
        }
        return hotkeyO
    }

    /**
     * Grab multiple hotkeys at once. They are appended to a group.
     * @param {string} name Group name
     * @param {?Array} definitions List of grab parameters. Ex: [["Ctrl+c", "Copy", callback], ["Ctrl+v", "Paste", callback]]
     * @returns {HotkeyGroup}
     */
    group(name, definitions = null) {
        const group = this._groups[name] ||= new HotkeyGroup()
        if (definitions) {
            // If the DOM elements are nested under the same data-hotkey-group, they would be included twice.
            group.push(...definitions.map(d => this.grab(...d)).filter(h => !group.includes(h)))
        }
        return group
    }

    /**
     * A sequence of combinations, ex: 'g i' or 'Shift Shift'.
     * @param {Key} hotkey
     * @returns {KeyEvent[]}
     */
    _parseSequence(hotkey) {
        return String(hotkey).split(" ").filter(part => part.length).map(part => this._parseHotkey(part))
    }

    /**
     *
     * @param {Key} hotkey Ex: Shift+s or Alt+Shift+Digit1
     * @returns {KeyEvent}
     */
    _parseHotkey(hotkey) {
        const parts = hotkey.split("+")
        if (parts[parts.length - 1] === "" && parts[parts.length - 2] === "") { // handle the plus key
            parts.splice(parts.length - 2, 2, "+") // `Alt++` -> ["Alt", "", ""] -> ["Alt", "+"]
        }
        let key = parts.pop() // the last element is the actual key, ex: Shift+Digit1 -> Digit1
        key = KEY_ALIASES[key.toLowerCase()] || key

        const event = {}
        const modifier = name => {
            const mod = MODIFIER_ALIASES[name.toLowerCase()]
            return mod === "Mod" ? (this.isMac() ? "Meta" : "Control") : mod // 'Mod+s' -> Cmd+s on a Mac, Ctrl+s elsewhere
        }
        const lone = parts.length === 0 && modifier(key) // a lone modifier ('Shift Shift'), it is a key on its own
        if (lone) {
            event.key = lone
            event[{ Shift: "shiftKey", Alt: "altKey", Control: "ctrlKey", Meta: "metaKey" }[lone]] = true
        } else {
            event[key.length === 1 ? "key" : "code"] = key // {"key": "f"} | {"code": "KeyF"}
        }

        parts.forEach(part => {
            const mod = modifier(part)
            if (mod) {
                event[{ Shift: "shiftKey", Alt: "altKey", Control: "ctrlKey", Meta: "metaKey" }[mod]] = true
            } else {
                console.warn(`Unknown modifier at ${hotkey}`)
            }
        })
        return event
    }

    /**
     * Wait for the next keystroke and hand over its definition string. Lets the user pick
     * their own combination. @see Hotkey.rebind
     *
     * @param {function} callback Receives the combination, ex: 'Ctrl+KeyJ', and the last KeyboardEvent.
     * @param {?{sequence: ?boolean, onProgress: ?function}} options With `sequence`, the keystrokes keep
     *  being appended ('g i') until the user pauses for `sequenceTimeout` ms; `onProgress` receives what
     *  has been typed so far, so that the UI can display it live.
     * @returns {function} Call it to cancel the recording.
     * @example wh.record(combination => myHotkey.rebind(combination))
     */
    record(callback, { sequence = false, onProgress = null } = {}) {
        const parts = []
        let timer = null
        let last = null
        const listener = e => {
            if (MODIFIER_KEYS.includes(e.key)) {
                return // wait for the modified key, ex: do not record a lone Ctrl of Ctrl+j
            }
            e.preventDefault?.()
            e.stopPropagation?.()
            parts.push(Hotkey.fromEvent(e))
            last = e
            if (!sequence || typeof setTimeout !== "function") {
                return commit()
            }
            // No confirmation key exists (Enter and Escape are legitimate hotkeys), so a sequence
            // ends the same way it is triggered later on - by the user pausing.
            clearTimeout(timer)
            timer = setTimeout(commit, this.options.sequenceTimeout)
            onProgress?.call(this, parts.join(" "), e) // may cancel us, hence called last
        }
        const commit = () => {
            stop()
            callback.call(this, parts.join(" "), last)
        }
        const stop = () => {
            if (timer) {
                clearTimeout(timer)
                timer = null
            }
            document.removeEventListener("keydown", listener, true)
            this._recording = null
        }
        this._recording?.() // only a single recording at a time
        this._recording = stop
        document.addEventListener("keydown", listener, true)
        return stop
    }

    /**
     * The user changes, ex: {"Ctrl+KeyS": "Ctrl+KeyD"} (original combination -> current one).
     * Ready to be sent to the server; feed it back with `applyRemapping`.
     * @returns {Object.<Key, Key>}
     */
    getRemapping() {
        return { ...this._remap }
    }

    /**
     * Put the hotkeys where the map says. This is the full state – a hotkey missing from the map
     * goes back to its default combination.
     * @param {Object.<Key, Key>} map @see getRemapping
     * @param {boolean} store Persist the map further on (localStorage, `onRemap`). Internal use.
     * @returns {WebHotkeys}
     */
    applyRemapping(map, store = true) {
        this._remap = Object.create(null)
        const rejected = []
        Object.entries(map || {}).forEach(([from, to]) => {
            if (isSafeCombination(from) && isSafeCombination(to)) {
                this._remap[from] = to
            } else {
                rejected.push(`${from} -> ${to}`)
            }
        })
        if (rejected.length) {
            console.warn("WebHotkeys.js> Dropping a remapping that is not a key combination:", rejected)
        }
        this.getHotkeys(false).forEach(hotkey => {
            const target = this._remap[hotkey.defaultCombination] || hotkey.defaultCombination
            if (target !== hotkey.getCombination()) {
                hotkey.rebind(target, false)
            }
        })
        if (store) {
            this._saveRemapping()
        }
        return this
    }

    /**
     * Load the remapping from the localStorage and keep it saved there on every further `rebind`.
     * Not needed unless you changed the `remap` option – it is the default behaviour.
     * @param {string} storageKey Kept at the 0.10 default, the `remap` option uses 'webhotkeys.remap'.
     * @returns {WebHotkeys}
     */
    persistRemapping(storageKey = "webhotkeys") {
        this._storageKey = storageKey
        return this._loadRemapping()
    }

    /** @returns {WebHotkeys} */
    _loadRemapping() {
        if (typeof localStorage === "undefined") { // ex: server side rendering
            return this
        }
        let stored
        try {
            stored = localStorage.getItem(this._storageKey)
        } catch (e) { // the storage may be disabled altogether
            console.warn("WebHotkeys.js> Cannot read the stored remapping", e)
            this._storageKey = null
            return this
        }
        if (!stored) {
            return this
        }
        const map = parseRemapping(stored)
        if (!map) {
            // We share the origin with the page – whatever sits here is not ours to overwrite.
            console.warn(`WebHotkeys.js> localStorage['${this._storageKey}'] holds a foreign value.`
                + " The remapping will not be stored; point the `remap` option to another key.")
            this._storageKey = null
            return this
        }
        this.applyRemapping(map, false)
        return this
    }

    _saveRemapping() {
        this.options.onRemap?.call(this, this.getRemapping())
        if (this._storageKey && typeof localStorage !== "undefined") {
            try {
                localStorage.setItem(this._storageKey, JSON.stringify(this.getRemapping()))
            } catch (e) {
                console.warn("WebHotkeys.js> Cannot store the remapping", e)
            }
        }
    }

    /**
     * Looping over the items (yt tracks list, fb notification list...)
     * ∀ page can use this list helper that handles different sorts of menus.
     *
     * @param {String} query DOM selector of li or anchors
     * @param {String} currentSelector The part of selector, describing currently selected item. If not defined or null, the default is: ":focus".
     * @param {fn} changeFn Visitor called on change (when we go next or back). Receives (newEl, oldEl) and returns true if we should continue (and change currentSelector of the newEl and oldElement).
     * @param {boolean} handleUpDown If true, UP and DOWN key are bound to this item listing.
     * @returns {_List}
     *
     * @example wh.list("ul#list li, #div a").handleUpDown() will cycle amongst li-s and a-s at once, using the default (:focus) selector.
     */
    list(query, currentSelector = null, changeFn = null, handleUpDown = false) {
        if (typeof this._list === "undefined") {
            // constructor
            this._list = new _List(query, currentSelector, changeFn, this);
        }
        if (typeof query !== "undefined") {
            this._list.setQuery(query);
        }
        if (currentSelector) {
            this._list.setCurrentSelector(currentSelector);
        }
        if (changeFn) {
            this._list.setChangeFn(changeFn);
        }
        if (handleUpDown) {
            this._list.handleUpDown();
        }
        return this._list;
    }

    /**
     * Is the user typing right now? Then a plain letter or a caret movement is none of our business.
     * @param {KeyEvent} e
     * @param {?HTMLElement} active
     * @returns {boolean}
     */
    _isTextContext(e, active) {
        return !e.altKey
            && !e.metaKey
            && (// this is a mere letter (not Escape, F1... which anticipate a hotkey)
                e.key?.length === 1
                // or a text editing keys that can take use of Ctrl (Left and Ctrl+Left is text editing)
                || ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "Delete", "Backspace"].includes(e.key)
                // or a text editing key that cannot take use of Ctrl (Enter is text editing, Ctrl+Enter is not)
                || ["Tab", "Enter"].includes(e.key) && !e.ctrlKey
            )
            // We are in a text editing context. Either a form tag like INPUT or within an editable element.
            && !!active
            && (FORM_TAGS.includes(active.tagName) && active.type !== "checkbox"
                || active.contentEditable === "true")
    }

    /**
     * Hotkeys possibly matching the keystroke, the most recently grabbed first.
     *
     * First check whether a `code` hotkey was defined (`Alt+Digit1`).
     * If not, try its `key` property (`Alt+1` (EN) or `Alt++` (CZ)).
     * If the key is a one-char but-not-letter sign ( -> not affectable by Shift), we ignore the Shift state.
     * Ex: To access the question mark on eng and cz keyboard, we have to hit Shift.
     * However, the developper sets the hotkey as "?", not "Shift+?".
     * If the key is a one-char upper-letter ( -> for sure affected by Shift), we convert it to the lower case.
     * Ex: Grabbed combination "Shift+Alt+l" would always produce "Shift+Alt+L".
     * Finally, the numpad falls back to the main row (`Numpad1` -> `Digit1`), unless claimed explicitly.
     * @param {KeyEvent} e
     * @returns {Hotkey[]}
     */
    _candidates(e) {
        const states = []
        if (e.code) {
            states.push(e.code + Hotkey.mod_state(e))
        }
        if (e.key) {
            const oneChar = e.key.length === 1
            states.push((oneChar && /[A-Z]/.test(e.key) ? e.key.toLowerCase() : e.key)
                + Hotkey.mod_state(e, oneChar && !/[A-Za-z]/.test(e.key)))
        }
        if (CODE_ALIASES[e.code]) { // shadow combination, tried only when nothing else matched
            states.push(CODE_ALIASES[e.code] + Hotkey.mod_state(e))
        }
        return states.flatMap(state => this._hotkeys[state]?.filter(hotkey => hotkey.enabled) || [])
            // A sequence is more specific than a plain hotkey of the same last key ('g i' beats 'i').
            // The sort is stable, so hotkeys of the same length keep the most-recently-grabbed-first order.
            .sort((a, b) => b.sequence.length - a.sequence.length)
    }

    /**
     * Have the preceding keystrokes been the beginning of this sequence?
     * @param {Hotkey} hotkey
     * @param {number} now
     * @returns {boolean}
     */
    _matchesSequence(hotkey, now) {
        const specs = hotkey.sequence.slice(0, -1) // the last one is the very keystroke being processed
        let i = this._buffer.length - 1
        for (let j = specs.length - 1; j >= 0; j--) {
            const spec = specs[j]
            // Hitting Shift+I registers a lone Shift keydown first. Skip such noise,
            // unless the step itself is a lone modifier (the 'Shift Shift' double tap).
            while (i >= 0 && !MODIFIER_KEYS.includes(spec.key) && MODIFIER_KEYS.includes(this._buffer[i].event.key)) {
                i--
            }
            const entry = this._buffer[i--]
            if (!entry || now - entry.time > this.options.sequenceTimeout || !Hotkey.match(spec, entry.event)) {
                return false
            }
        }
        return true
    }

    /** @returns {boolean} The buffer is a beginning of some sequence – swallow the key and wait for the rest. */
    _pendingSequence(now) {
        return this.getHotkeys().some(hotkey => hotkey.sequence.length > this._buffer.length
            && this._buffer.every((entry, i) => now - entry.time <= this.options.sequenceTimeout
                && Hotkey.match(hotkey.sequence[i], entry.event)))
    }

    /**
     *
     * @param {KeyEvent} e
     * @returns {undefined|boolean}
     */
    _trigger(e) {
        if (this._destroyed) {
            return
        }
        if (this._recording) {
            return // `record` is capturing the keystroke; even Escape and F1 belong to it
        }
        if (this._help?.open) { // the help dialog swallows the page hotkeys
            if (["Escape", "F1"].some(key => e.key === key || e.code === key)) {
                this.hideHelp()
                e.preventDefault?.()
                e.stopPropagation?.()
            }
            return
        }
        this.hideHints() // any keystroke dismisses the badges (the hotkey below still runs)

        const active = this.activeElement()
        const { ignore } = this.options
        if (ignore && active && (isString(ignore) ? active.closest?.(ignore) : ignore.call(this, active, e))) {
            return
        }
        // an input field has precedence over shorcuts
        // Ex: arrow hotkeys must not work, these control text caret
        const typing = this._isTextContext(e, active)
        const now = Date.now()

        for (const hotkey of this._candidates(e)) {
            if (typing && !hotkey.allowInput) {
                continue
            }
            if (hotkey.sequence.length > 1 && !this._matchesSequence(hotkey, now)) {
                continue // the preceding keystrokes were something else
            }
            const { action, element, scope } = hotkey
            // check we are in an allowed scope (the focused element has hotkey.scope for the ancestor)
            if (scope && !( // The scope is either a selector or a function or an HTMLElement
                isString(scope) ? active?.closest?.(scope)
                    : (scope instanceof Function ? scope.call(this, active, e)
                        : scope.contains?.(active)))) {
                continue // not allowed scope
            }

            // trigger the hotkey
            let result
            if (element) {
                if (element.disabled || !isVisible(element)) {
                    continue // action is a disabled or hidden HTMLElement, continue to next shorcut
                }
                // note that result is always none
                this._act(element)
            } else {
                result = action.call(this, e)
            }

            if (result === false) {
                continue // custom method failed, try next hotkey
            }

            this._buffer.length = 0 // the sequence has been consumed
            this.options.onTrigger?.call(this, hotkey, e)

            // prevent default behaviour (ex: Ctrl+L going to the address bar)
            e.stopPropagation?.() // the method may not be available in a crafted event
            e.preventDefault?.()
            return true
        }

        if (typing) {
            return
        }
        this._buffer.push({ event: e, time: now })
        while (this._buffer.length && (this._buffer.length > 8 || now - this._buffer[0].time > this.options.sequenceTimeout)) {
            this._buffer.shift()
        }
        if (this._pendingSequence(now)) {
            e.preventDefault?.() // ex: 'g' of the 'g i' sequence must not scroll the page
            e.stopPropagation?.()
            return
        }
        this._buffer.length = 0 // no sequence may start here, forget the history
        this.options.onMiss?.call(this, e)
    }

    /**
     * What a linked element does when its hotkey fires. Overridable by [data-hotkey-action].
     * @param {HTMLElement} element
     */
    _act(element) {
        const mode = element.getAttribute?.(this.options.selectorAction)
            || (FORM_TAGS.includes(element.tagName) && element.type !== "checkbox" ? "focus" : "click")
        switch (mode) {
            case "focus": return element.focus()
            case "none": return
            case "toggle":
                if (element.tagName === "DETAILS") {
                    element.open = !element.open
                } else if (element.type === "checkbox" || element.type === "radio") {
                    element.checked = !element.checked
                    element.dispatchEvent?.(new Event("change", { bubbles: true }))
                } else {
                    element.click()
                }
                return
            default: return element.click()
        }
    }

    /**
     *
     * @param {Key|KeyEvent} hotkey Ex: 'Ctrl+j' or a sequence 'g i' or a KeyEvent-like object.
     */
    simulate(hotkey) {
        if (hotkey.constructor === String) {
            return this._parseSequence(hotkey).map(event => this._trigger(event)).pop()
        }
        return this._trigger(hotkey)
    }

    //
    // Visual helpers
    //

    /**
     * Show the hotkey list. Uses a modal dialog, falls back to an alert.
     * @returns {WebHotkeys}
     */
    showHelp() {
        const dialog = this.options.help === "dialog" && createEl("dialog")
        if (!dialog?.showModal) {
            typeof alert === "function" ? alert(this.getText()) : console.log(this.getText())
            return this
        }
        this.hideHelp()
        this._injectStyle()
        dialog.className = "webhotkeys-dialog"

        const head = createEl("div", "webhotkeys-head", dialog)
        createEl("strong", "", head).textContent = "Keyboard shortcuts"
        const filter = createEl("input", "webhotkeys-filter", head)
        filter.type = "search"
        filter.placeholder = "Filter…"
        const close = createEl("button", "webhotkeys-close", head)
        close.textContent = "✕"
        close.onclick = () => this.hideHelp()

        const body = createEl("div", "webhotkeys-body", dialog)
        this.getGroups().forEach(({ name, hotkeys }) => {
            if (name) {
                createEl("h3", "", body).textContent = name
            }
            hotkeys.forEach(hotkey => {
                const row = createEl("div", "webhotkeys-row", body)
                const key = createEl(this.options.remap ? "button" : "kbd", "webhotkeys-key", row)
                key.textContent = hotkey.getClue()
                createEl("span", "webhotkeys-hint", row).textContent = hotkey.hint
                if (this.options.remap) {
                    this._makeEditable(row, key, hotkey)
                }
            })
        })
        if (this.options.remap) {
            createEl("p", "webhotkeys-note", body).textContent = "Click a combination to remap it."
        }
        filter.oninput = () => {
            const needle = filter.value.toLowerCase()
            body.querySelectorAll(".webhotkeys-row").forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(needle) ? "" : "none"
            })
        }

        document.body.appendChild(dialog)
        this._help = dialog
        dialog.addEventListener("close", () => this.hideHelp())
        // Escape while recording belongs to the recording, not to the dialog. Our keydown listener
        // cannot stop this one – the browser closes a <dialog> through the 'cancel' event.
        dialog.addEventListener("cancel", e => this._recording && e.preventDefault?.())
        dialog.showModal()
        return this
    }

    /**
     * Turn a help row into a remappable one: click the combination, press your own.
     * @param {HTMLElement} row
     * @param {HTMLElement} key The button displaying the combination.
     * @param {Hotkey} hotkey
     */
    _makeEditable(row, key, hotkey) {
        const PROMPT = "Click and press your own combination"
        key.type = "button"
        const reset = createEl("button", "webhotkeys-reset", row)
        reset.textContent = "↺"
        reset.title = "Back to the default combination"

        /** @param {boolean} keepFocus Stay on the button the user has just used, ready for another go. */
        const refresh = (keepFocus = false) => {
            key.textContent = hotkey.getClue()
            key.className = "webhotkeys-key"
            const changed = hotkey.getCombination() !== hotkey.defaultCombination
            reset.style.display = changed ? "" : "none"
            // The whole list is right here – tell the user straight away that somebody else has the key.
            const clash = this.getConflicts().find(c => c.combination === hotkey.getCombination())
            row.className = "webhotkeys-row" + (clash ? " webhotkeys-clash" : "")
            key.title = clash
                ? `Also used by: ${clash.hotkeys.filter(h => h !== hotkey).map(h => h.hint).join(", ")}`
                : PROMPT
            if (keepFocus) {
                key.focus?.() // the reset button may have just disappeared, the focus would fall to the body
            }
        }
        refresh()

        reset.onclick = () => {
            hotkey.rebind()
            refresh(true)
        }
        key.onclick = () => {
            if (this._recording) { // a second click cancels
                return this._recording()
            }
            key.className = "webhotkeys-key webhotkeys-recording"
            key.textContent = "…"
            this.record(combination => {
                if (combination !== "Escape") {
                    hotkey.rebind(combination)
                }
                refresh(true)
            }, {
                sequence: true,
                onProgress: partial => {
                    if (partial.split(" ").pop() === "Escape") { // cancel, do not wait for the timeout
                        this._recording?.()
                        return refresh(true)
                    }
                    key.textContent = partial + " …"
                }
            })
        }
    }

    /** @returns {WebHotkeys} */
    hideHelp() {
        this._recording?.()
        if (this._help) {
            const dialog = this._help
            this._help = null // prevent the 'close' listener recursion
            dialog.close?.()
            dialog.remove?.()
        }
        return this
    }

    /**
     * Badge every visible element having a hotkey with its combination, the Vimium way.
     * @returns {WebHotkeys}
     */
    showHints() {
        if (typeof document === "undefined" || !document.body) {
            return this
        }
        this.hideHints()
        this._injectStyle()
        const layer = createEl("div", "webhotkeys-hints")
        this.getHotkeys().forEach(hotkey => {
            const el = hotkey.element
            if (!el || !isVisible(el)) {
                return
            }
            const rect = el.getBoundingClientRect?.()
            if (!rect || (!rect.width && !rect.height)) {
                return
            }
            const badge = createEl("kbd", "webhotkeys-badge", layer)
            badge.textContent = hotkey.getClue()
            badge.style.left = `${rect.left + window.scrollX}px`
            badge.style.top = `${rect.top + window.scrollY}px`
        })
        document.body.appendChild(layer)
        this._hints = layer
        this._dismissHints = () => this.hideHints()
        window.addEventListener("scroll", this._dismissHints, { passive: true, once: true })
        window.addEventListener("resize", this._dismissHints, { once: true })
        return this
    }

    /** @returns {WebHotkeys} */
    hideHints() {
        if (this._hints) {
            this._hints.remove?.()
            this._hints = null
            window.removeEventListener("scroll", this._dismissHints)
            window.removeEventListener("resize", this._dismissHints)
        }
        return this
    }

    /** @returns {WebHotkeys} */
    toggleHints() {
        return this._hints ? this.hideHints() : this.showHints()
    }

    /** The stylesheet for the help dialog and the hint badges. Injected on the first use only. */
    _injectStyle() {
        if (this._style || typeof document === "undefined" || !document.head) {
            return
        }
        this._style = createEl("style")
        this._style.textContent = `
.webhotkeys-dialog { border: 0; border-radius: .5em; padding: 0; max-width: 40em; width: 90%; max-height: 80vh;
    box-shadow: 0 .5em 2em rgba(0,0,0,.35); font: inherit; background: Canvas; color: CanvasText; }
.webhotkeys-dialog::backdrop { background: rgba(0,0,0,.4); }
.webhotkeys-head { display: flex; gap: .5em; align-items: center; padding: .75em 1em; border-bottom: 1px solid rgba(128,128,128,.3); }
.webhotkeys-head strong { flex: 0 0 auto; }
.webhotkeys-filter { flex: 1 1 auto; min-width: 4em; padding: .25em .5em; font: inherit; }
.webhotkeys-close { flex: 0 0 auto; cursor: pointer; border: 0; background: transparent; font: inherit; }
.webhotkeys-body { padding: .5em 1em 1em; overflow: auto; max-height: 65vh; }
.webhotkeys-body h3 { margin: 1em 0 .25em; font-size: 1em; opacity: .7; }
.webhotkeys-row { display: flex; gap: .75em; padding: .15em 0; }
.webhotkeys-key { flex: 0 0 9em; text-align: right; }
kbd.webhotkeys-key, button.webhotkeys-key { display: inline-block; font-family: monospace; font-size: .85em;
    padding: .15em .5em; border: 1px solid rgba(128,128,128,.4); border-radius: .3em; background: rgba(128,128,128,.12); }
/* The remappable combination is a <button>; it must still read as the plain kbd badge above. */
button.webhotkeys-key { color: inherit; cursor: pointer; }
button.webhotkeys-key:hover { background: rgba(128,128,128,.22); }
button.webhotkeys-key:focus { outline: 2px solid currentColor; outline-offset: 1px; }
.webhotkeys-recording { background: #ffd76e; color: #222; }
.webhotkeys-hint { flex: 1 1 auto; }
.webhotkeys-clash .webhotkeys-key { color: #c0392b; }
.webhotkeys-reset { flex: 0 0 auto; border: 0; background: transparent; color: inherit; cursor: pointer; opacity: .6; }
.webhotkeys-note { margin: 1.5em 0 0; font-style: italic; font-size: .9em; opacity: .6; }
.webhotkeys-hints { position: absolute; inset: 0; pointer-events: none; z-index: 2147483000; }
.webhotkeys-badge { position: absolute; transform: translate(-30%, -50%); pointer-events: none;
    background: #ffd76e; color: #222; border: 1px solid #b98d00; border-radius: .25em;
    padding: 0 .3em; font: bold 11px/1.5 monospace; white-space: nowrap; }`
        document.head.appendChild(this._style)
    }

    /**
     * Easily get the stylesheet on the fly.
     *
     * Based on: https://davidwalsh.name/add-rules-stylesheets
     *
     * @return {CSSStyleSheet}
     */
    getSheet() {
        if (typeof this._sheet === "undefined") {
            this._sheet = (() => {
                // Create the <style> tag
                const style = document.createElement("style");

                // Add a media (and/or media query) here if you'd like!
                // style.setAttribute("media", "screen")
                // style.setAttribute("media", "only screen and (max-width : 1024px)")

                // WebKit hack :(
                style.appendChild(document.createTextNode(""));

                // Add the <style> this to the page
                document.head.appendChild(style);
                this._userStyle = style

                return style.sheet;
            })();
        }
        return this._sheet;
    }

    /**
     * Easily add to the stylesheet on the fly.
     *
     * @param {string} cssRule
     * @example wh.listHandlesUpDown().list("ul li"); wh.insertCss("ul li:focus {border:5px solid red}");
     * @returns {undefined}
     */
    insertCss(cssRule) {
        this.getSheet().insertRule(cssRule);
    }
}


/**
 * @see WebHotkeys.list
 */
class _List {
    constructor(query, currentSelector, method, _wh) {
        if (typeof query === "undefined") {
            query = "div";
        }
        if (typeof currentSelector === "undefined" || currentSelector === null) {
            currentSelector = ":focus";
        }

        this.query = query
        this.currentSelector = currentSelector
        this.method = method
        this.selected = null
        this._wh = _wh
        /** @type {boolean} Jump from the last item to the first one and back. */
        this.wrap = false
        /** @type {boolean} Scroll the newly selected item into the view. */
        this.scroll = true
    }

    /**
     * @see WebHotkeys.list
     */
    setQuery(query) {
        this.query = query;
        return this;
    }

    /**
     * @param {String} currentSelector The part of selector, describing currently selected item. If not defined or null, the default is: ":focus".
     * @param {String} css Code that will highlight the selector.
     * @example wh.list("ul li").setCurrentSelector(".custom-active", "{border:5px solid red}")
     */
    setCurrentSelector(currentSelector, css = null) {
        this.currentSelector = currentSelector
        if (css) {
            this._wh.insertCss(this.query + this.currentSelector + css);
        }
        return this
    }

    /**
     * @see WebHotkeys.list
     */
    setChangeFn(method) {
        this.method = method;
        return this
    }

    /**
     * @param {fn} Method will be called after the successful change of the selected element, receives newEl as a param.
     * @returns {_List}
     */
    setCallback(method) {
        this._callback = method
        return this
    }

    /**
     * Going below the last item continues at the first one (and vice versa).
     * @param {boolean} wrap
     * @returns {_List}
     */
    setWrap(wrap = true) {
        this.wrap = wrap
        return this
    }

    /**
     * @param {boolean} scroll Scroll the selected item into the view.
     * @returns {_List}
     */
    setScroll(scroll = true) {
        this.scroll = scroll
        return this
    }

    /**
     * Macro: Arrows UP/DOWN grabbed for listing instead of `this.list().goPrev/goNext`
     */
    handleUpDown() {
        this._wh.grab("ArrowUp", "Lists up", () => this.goPrev())
        this._wh.grab("ArrowDown", "Lists down", () => this.goNext())
        return this
    }

    /**
     * Macro: Home/End jump to the first/last item.
     */
    handleHomeEnd() {
        this._wh.grab("Home", "Lists first", () => this.goFirst())
        this._wh.grab("End", "Lists last", () => this.goLast())
        return this
    }

    /**
     * Type the first letters of an item to select it (the classic listbox behaviour).
     * @param {number} timeout Milliseconds before the typed prefix is forgotten.
     * @returns {_List}
     */
    handleTypeahead(timeout = 800) {
        let prefix = ""
        let last = 0
        this._typeahead = e => {
            if (e.key?.length !== 1 || e.ctrlKey || e.altKey || e.metaKey || this._wh._isTextContext(e, this._wh.activeElement())) {
                return
            }
            const now = Date.now()
            prefix = (now - last > timeout ? "" : prefix) + e.key.toLowerCase()
            last = now
            if (this.selectByPrefix(prefix)) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
        document.addEventListener("keydown", this._typeahead, true)
        return this
    }

    /**
     * @param {string} prefix
     * @returns {boolean} Something has been selected.
     */
    selectByPrefix(prefix) {
        this._loadSiblings()
        const found = Array.from(this.items || []).find(el => (el.innerText || el.textContent || "").trim().toLowerCase().startsWith(prefix))
        if (found) {
            this._change(found, this.selected)
        }
        return !!found
    }

    /** Detach the typeahead listener. @see WebHotkeys.destroy */
    destroy() {
        if (this._typeahead) {
            document.removeEventListener("keydown", this._typeahead, true)
            this._typeahead = null
        }
        return this
    }

    /**
     * Set .next, .prev, .selected
     * @param {int} steps Default: 1. Distance between .next and .selected.
     * @returns {boolean}
     */
    _loadSiblings(steps = 1) {
        // check if there is a selected item already
        this.items = document.querySelectorAll(this.query);


        if (!this.items.length) {
            //if (this._debug) {
            //    console.warn("WebHotkeys.js list: Can't list items on query: " + this.query);
            //}
            return false;
        }
        for (let el of document.querySelectorAll(this.query)) {
            if (el.matches(this.currentSelector)) {
                this.selected = el;
            }
        }

        if (this.selected) {// item already selected
            const count = this.items.length
            for (let i = 0; i < count; i++) { // loops the items
                if (this.selected.isSameNode(this.items[i])) { // this is our selected item in the DOM
                    this.prev = this.items[this.wrap ? (i - steps % count + count) % count : Math.max(i - steps, 0)];
                    this.next = this.items[this.wrap ? (i + steps) % count : Math.min(i + steps, count - 1)];
                    return true;
                }
            }
        } else {
            this.prev = this.next = this.selected = this.items[0];
            return true;
        }
        return false;
    }

    setCurrent(el) {
        if (this._loadSiblings()) {
            this._change(el);
            if (!this._loadSiblings()) {
                console.error("WebHotkeys.js> Could not change successfully to:", el);
            }
        }
        return this;
    }

    /**
     * Get current this matching the selector. (Even if it changed since ex: last go call due to another user activity on page.)
     * @return {null|HTMLElement|*}
     */
    getCurrent() {
        this._loadSiblings()
        return this.selected
    }

    goNext(steps) {
        return this._loadSiblings(steps) ? this._change(this.next, this.selected) : false
    }

    goPrev(steps) {
        return this._loadSiblings(steps) ? this._change(this.prev, this.selected) : false
    }

    goFirst() {
        return this._loadSiblings() ? this._change(this.items[0], this.selected) : false
    }

    goLast() {
        return this._loadSiblings() ? this._change(this.items[this.items.length - 1], this.selected) : false
    }

    /**
     *
     * @param {boolean} forward
     * @param {number} steps
     * @returns {boolean}
     */
    go(forward = true, steps = 1) {
        return this._loadSiblings(steps) ? this._change((forward ? this.next : this.prev), this.selected) : false
    }

    _change(newEl, oldEl) {
        let proceed = true
        if (typeof this.method === "function") {
            proceed = this.method(newEl, oldEl)
        }
        if (proceed) {
            if (this.currentSelector.substr(0, 1) === ".") {
                let cl = this.currentSelector.substr(1)
                if (oldEl) {
                    oldEl.classList.remove(cl)
                }
                if (newEl) {
                    newEl.classList.add(cl)
                }
            } else if (this.currentSelector.substring(0, 1) === "[") {
                const attrName = this.currentSelector.substring(1, this.currentSelector.length - 1)
                if (oldEl) {
                    oldEl.removeAttribute(attrName)
                }
                if (newEl) {
                    newEl.setAttribute(attrName, "1")
                }
            } else if (this.currentSelector.indexOf(":focus") === 0) {
                newEl.focus();
            } else { //selector can be I.E. a data-attribute
                console.error("WebHotkeys.js> Don't know how to process selector type:", this.currentSelector)
                return false;
            }
            this.selected = newEl;
            if (this.scroll) {
                newEl?.scrollIntoView?.({ block: "nearest" })
            }
            if (this._callback) {
                this._callback(newEl)
            }
        }
        return true
    }
}

//
// Static methods
//

function isString(t) {
    return typeof t === 'string' || t instanceof String
}

/**
 * A stored remapping is a flat {combination: combination} object. Anything else found under our
 * localStorage key belongs to somebody else (the page shares the origin with us) and must be kept intact.
 * @param {string} stored
 * @returns {?Object.<Key, Key>} Null when the value is not ours.
 */
function parseRemapping(stored) {
    let map
    try {
        map = JSON.parse(stored)
    } catch (e) {
        return null
    }
    if (!map || typeof map !== "object" || Array.isArray(map)) {
        return null
    }
    return Object.values(map).every(isString) ? map : null
}

/**
 * Is the string a combination we could have produced ourselves?
 *
 * A remapping arrives from the outside – the localStorage, or the server the page loaded it from
 * (where it may well be another user's). An unchecked combination ends up in the element hint, and
 * with the `hint: 'text'` option that means `innerHTML` – ex. '<img src=x onerror=…>' would run.
 * Hence: modifiers we know of, and a key that is either a single character ('?', '+') or a plain
 * identifier ('KeyJ', 'ArrowUp', 'F5').
 *
 * @param {Key} combination
 * @returns {boolean}
 */
function isSafeCombination(combination) {
    if (!isString(combination) || !combination.trim()) {
        return false
    }
    return combination.split(" ").filter(part => part.length).every(part => {
        const parts = part.split("+")
        if (parts[parts.length - 1] === "" && parts[parts.length - 2] === "") {
            parts.splice(parts.length - 2, 2, "+") // the plus key, ex: 'Alt++'
        }
        const key = parts.pop()
        return (key.length === 1 || /^[A-Za-z0-9]+$/.test(key))
            && parts.every(mod => MODIFIER_ALIASES[mod.toLowerCase()])
    })
}

/** @returns {Object} Only the modifier flags of the event. */
function pickModifiers(e) {
    return { ctrlKey: !!e.ctrlKey, shiftKey: !!e.shiftKey, altKey: !!e.altKey, metaKey: !!e.metaKey }
}

/** Case insensitive comparison of the `key` values. */
function keyEquals(a, b) {
    return a === b || (a?.length === 1 && b?.length === 1 && a.toLowerCase() === b.toLowerCase())
}

/**
 * A hidden element must not swallow its hotkey.
 * @param {HTMLElement} el
 * @returns {boolean}
 */
function isVisible(el) {
    if (el.getClientRects === undefined && el.checkVisibility === undefined) {
        return true // not a real DOM element (a test stub), do not judge it
    }
    if (el.hidden || el.closest?.("[inert],[hidden]")) {
        return false
    }
    if (typeof el.checkVisibility === "function") {
        return el.checkVisibility()
    }
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects?.().length)
}

/**
 * @param {string} tag
 * @param {string} className
 * @param {?HTMLElement} parent
 * @returns {?HTMLElement}
 */
function createEl(tag, className = "", parent = null) {
    if (typeof document === "undefined" || !document.createElement) {
        return null
    }
    const el = document.createElement(tag)
    if (className) {
        el.className = className
    }
    parent?.appendChild(el)
    return el
}

//
// Public
//
if (typeof document !== "undefined" && document.currentScript && new URL(document.currentScript.src).searchParams.has("register")) { // currentScript is unavailable in i.e. a content script
    window.webHotkeys = new WebHotkeys()
}

// CommonJS/bundler consumers (npm install). Guarded so a plain `<script>` tag (no module system
// present) never touches this - the global classes above remain the only thing it defines.
if (typeof module !== "undefined" && module.exports) {
    module.exports = WebHotkeys
    module.exports.WebHotkeys = WebHotkeys
    module.exports.Hotkey = Hotkey
    module.exports.HotkeyGroup = HotkeyGroup
}
