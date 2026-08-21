// Type definitions for webhotkeys
// Project: https://github.com/CZ-NIC/webhotkeys

/** A key combination. Either an `event.code` ("Digit1"), an `event.key` ("1"), a combination
 *  with modifiers ("Ctrl+Digit1", "Mod+s") or a space separated sequence ("g i", "Shift Shift"). */
export type Key = string

/** An element, its selector or a callback. Returning `false` from the callback lets the event fall through. */
export type Action = HTMLElement | string | ((this: WebHotkeys, event: KeyboardEvent) => unknown)

/** Where a hotkey is allowed to fire. A selector / element the focus must be within, or a predicate. */
export type Scope = HTMLElement | string | ((this: WebHotkeys, active: HTMLElement | null, event: KeyboardEvent) => boolean)

/** Like a KeyboardEvent, but not guaranteed to carry every property. Ex: `{code: "Digit1", altKey: true}` */
export type KeyEvent = Partial<KeyboardEvent>

export interface WebHotkeysOptions {
    /** Append the shortcut text to the element `title`, to its text (its label for a form element), or nowhere. */
    hint?: "title" | "text" | false
    /** Put the help under F1. */
    grabF1?: boolean
    /** How the help is displayed. The dialog falls back to an alert when the DOM is unavailable. */
    help?: "dialog" | "alert"
    /** Combination toggling the visual badges over every element having a hotkey. Ex: "F2". */
    hintKey?: Key | null
    /** Convert the `[accesskey]` elements to hotkeys. */
    replaceAccesskeys?: boolean
    /** Watch the DOM and un/grab the hotkeys as the elements dis/appear. */
    observe?: boolean
    /** Called on a linked element's hotkey toggle. `this` is the hotkey. */
    onToggle?: ((this: Hotkey, element: HTMLElement, enabled: boolean) => void) | null
    /** Called right after a hotkey fired. */
    onTrigger?: ((this: WebHotkeys, hotkey: Hotkey, event: KeyboardEvent) => void) | null
    /** Called when a keystroke matched no hotkey. */
    onMiss?: ((this: WebHotkeys, event: KeyboardEvent) => void) | null
    /** Attribute name linking the DOM elements to the shortcuts. */
    selector?: string
    /** Attribute name linking the DOM elements to the groups. */
    selectorGroup?: string
    /** Attribute name overriding what happens with the element: "click" | "focus" | "toggle" | "none". */
    selectorAction?: string
    /** Selector or predicate. While it matches the focused element, no hotkey fires at all. */
    ignore?: string | ((this: WebHotkeys, active: HTMLElement | null, event: KeyboardEvent) => boolean) | null
    /** Milliseconds a key sequence ("g i") may be spread over. Also the pause committing a recorded sequence. */
    sequenceTimeout?: number
    /** Let the user rebind the combinations right in the F1 dialog. A string is the localStorage key
     *  (true means "webhotkeys.remap"), false turns the editing off. A foreign value found under the
     *  key is never overwritten - the layout is then not persisted at all. */
    remap?: boolean | string
    /** Called with the whole remapping whenever the user changes a combination. Ex: store it on the server. */
    onRemap?: ((this: WebHotkeys, map: Record<Key, Key>) => void) | null
    /** Render the combinations the Apple way (⌘⌥⇧⌃) and resolve "Mod" to Meta. Null autodetects. */
    mac?: boolean | null
    /** Warn in the console when a newly grabbed hotkey shadows a scope-less one. */
    warnConflicts?: boolean
}

export declare class Hotkey {
    action: HTMLElement | Function
    hint: string
    scope: Scope | null
    /** The whole sequence; a plain hotkey is a sequence of one combination. */
    sequence: KeyEvent[]
    /** The combination that actually triggers the hotkey (the last one of the sequence). */
    event: KeyEvent
    element: HTMLElement | null
    enabled: boolean
    /** Fires even while the user is typing. @see allowInInput */
    allowInput: boolean
    /** The combination the hotkey was grabbed with; survives `rebind`. */
    defaultCombination: Key

    /** Text representation of the combination, ex: "Ctrl+k" (or "⌘k" on a Mac). */
    getClue(appendParenthesis?: boolean): string
    /** Platform independent definition string, ex: "Ctrl+k". */
    getCombination(): Key
    /** "Ctrl+k: Hint text" */
    getText(): string
    /** Fire even inside an input / contenteditable. */
    allowInInput(allow?: boolean): this
    /** Move the hotkey to another combination (user remapping). No argument = back to the default. */
    rebind(combination?: Key | null): this
    enable(): this
    disable(): this
    toggle(enable?: boolean | null): this
    /** Forget the hotkey for good (groups, help, the linked element). */
    remove(): this

    static comboText(event: KeyEvent, mac?: boolean): string
    static fromEvent(event: KeyEvent): Key
    static match(spec: KeyEvent, event: KeyEvent): boolean
}

export declare class HotkeyGroup extends Array<Hotkey> {
    enable(): this
    disable(): this
    toggle(enable?: boolean | null): this
    remove(): this
}

export declare class HotkeyList {
    setQuery(query: string): this
    setCurrentSelector(currentSelector: string, css?: string | null): this
    setChangeFn(method: (newEl: HTMLElement, oldEl: HTMLElement) => boolean): this
    setCallback(method: (newEl: HTMLElement) => void): this
    setWrap(wrap?: boolean): this
    setScroll(scroll?: boolean): this
    handleUpDown(): this
    handleHomeEnd(): this
    handleTypeahead(timeout?: number): this
    selectByPrefix(prefix: string): boolean
    getCurrent(): HTMLElement | null
    setCurrent(el: HTMLElement): this
    goNext(steps?: number): boolean
    goPrev(steps?: number): boolean
    goFirst(): boolean
    goLast(): boolean
    go(forward?: boolean, steps?: number): boolean
    destroy(): this
}

export declare class WebHotkeys {
    constructor(options?: WebHotkeysOptions)
    options: WebHotkeysOptions

    setOptions(options: WebHotkeysOptions): this
    /** Detach the listener and the observer, forget every hotkey. */
    destroy(): this

    grab(hotkey: Key, action: Action): Hotkey
    grab(hotkey: Key, hint: string, action: Action, scope?: Scope | null): Hotkey
    group(name: string, definitions?: Array<[Key, string | Action, Action?, (Scope | null)?]>): HotkeyGroup
    list(query: string, currentSelector?: string | null, changeFn?: Function | null, handleUpDown?: boolean): HotkeyList

    /** Manually fire a combination or a whole sequence. */
    simulate(hotkey: Key | KeyEvent): boolean | undefined

    getHotkeys(enabledOnly?: boolean): Hotkey[]
    getGroups(): { name: string, hotkeys: Hotkey[] }[]
    getText(): string
    getConflicts(): { combination: Key, hotkeys: Hotkey[] }[]

    /** Wait for the next keystroke, hand over its definition string. Returns a canceller.
     *  With `sequence`, the keystrokes are collected ("g i") until the user pauses for `sequenceTimeout`. */
    record(
        callback: (this: WebHotkeys, combination: Key, event: KeyboardEvent) => void,
        options?: {
            sequence?: boolean,
            onProgress?: ((this: WebHotkeys, partial: Key, event: KeyboardEvent) => void) | null
        }
    ): () => void
    /** The user changes: the default combination -> the current one. */
    getRemapping(): Record<Key, Key>
    /** The full remapping state; a hotkey missing from the map returns to its default combination.
     *  An entry that is not a key combination is dropped - the map may come from the outside. */
    applyRemapping(map: Record<Key, Key>): this
    /** Only needed when the `remap` option is off. */
    persistRemapping(storageKey?: string): this

    showHelp(): this
    hideHelp(): this
    showHints(): this
    hideHints(): this
    toggleHints(): this

    /** The focused element, piercing the shadow DOM. */
    activeElement(): HTMLElement | null
    isMac(): boolean
    getSheet(): CSSStyleSheet
    insertCss(cssRule: string): void
}

export default WebHotkeys

declare global {
    interface Window {
        /** Set when the script is loaded with the `?register` parameter. */
        webHotkeys?: WebHotkeys
    }
}
