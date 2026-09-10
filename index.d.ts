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
    /** Combination that opens the help. `null` grabs nothing. */
    helpKey?: Key | null
    /** How the help is displayed. The dialog falls back to an alert when the DOM is unavailable. */
    help?: "dialog" | "alert"
    /** Combination toggling the visual badges over every element having a hotkey. `null` grabs nothing. */
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
    /** Fires even while the user is typing. Set via `grab(..., {inInput: true})`, or directly. */
    allowInput: boolean
    /** The combination the hotkey was grabbed with; survives `rebind`. */
    defaultCombination: Key

    /** Text representation of the combination, ex: "Ctrl+k" (or "⌘k" on a Mac). */
    readonly clue: string
    /** Platform independent definition string, ex: "Ctrl+k". */
    readonly combination: Key
    /** "Ctrl+k: Hint text" */
    readonly text: string
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

export interface ListOptions {
    /** Selector describing the currently selected item. @default ":focus" */
    current?: string
    /** Injected via the internal `_insertCss` as `query + current + css`. */
    css?: string | null
    /** Jump from the last item to the first one and back. @default false */
    wrap?: boolean
    /** Scroll the newly selected item into the view. @default true */
    scroll?: boolean
    /** Called with (newEl, oldEl) before the change; returning `false` cancels it. */
    onChange?: ((newEl: HTMLElement, oldEl: HTMLElement | null) => boolean | void) | null
    /** Called with (newEl) once the change has happened. */
    onChanged?: ((newEl: HTMLElement) => void) | null
    /** Grab ArrowUp/ArrowDown for this listing. @default false */
    upDown?: boolean
    /** Grab Home/End for this listing. @default false */
    homeEnd?: boolean
    /** `true` uses an 800 ms timeout, a number sets a custom one (ms). @default false */
    typeahead?: boolean | number
    /** Restricts the upDown/homeEnd grabs - give each list a distinct scope so several lists on
     *  the same page don't fight over the arrow keys. */
    scope?: Scope | null
}

export declare class HotkeyList {
    selectByPrefix(prefix: string): boolean
    /** The currently selected element (even if it changed since the last `go*` call). */
    current: HTMLElement | null
    goNext(steps?: number): boolean
    goPrev(steps?: number): boolean
    goFirst(): boolean
    goLast(): boolean
    go(forward?: boolean, steps?: number): boolean
    destroy(): this
}

export interface GridOptions {
    /** Selector describing the currently selected cell. @default ":focus" */
    current?: string
    /** Wrap around row/column edges instead of stopping there. @default false */
    wrap?: boolean
    /** Scroll the newly selected cell into the view. @default true */
    scroll?: boolean
    /** Called with (newEl, oldEl) before the change; returning `false` cancels it. */
    onChange?: ((newEl: HTMLElement, oldEl: HTMLElement | null) => boolean | void) | null
    /** Called with (newEl) once the change has happened. */
    onChanged?: ((newEl: HTMLElement) => void) | null
    /** Restricts the Up/Down/Left/Right grabs - give each grid a distinct scope so several
     *  tables on the same page don't fight over the arrow keys. */
    scope?: Scope | null
}

export declare class HotkeyGrid {
    /** Move to the same column in the row above, clamping the column to that row's width. */
    goUp(steps?: number): boolean
    /** Move to the same column in the row below, clamping the column to that row's width. */
    goDown(steps?: number): boolean
    /** Move to the previous cell within the current row. */
    goLeft(steps?: number): boolean
    /** Move to the next cell within the current row. */
    goRight(steps?: number): boolean
    /** Detach the Up/Down/Left/Right grabs. */
    destroy(): this
}

export declare class WebHotkeys {
    constructor(options?: WebHotkeysOptions)
    options: WebHotkeysOptions

    setOptions(options: WebHotkeysOptions): this
    /** Detach the listener and the observer, forget every hotkey. */
    destroy(): this

    grab(hotkey: Key, action: Action): Hotkey
    grab(hotkey: Key, hint: string, action: Action, scope?: Scope | { scope?: Scope | null, inInput?: boolean } | null): Hotkey
    group(name: string, definitions?: Array<[Key, string | Action, Action?, (Scope | { scope?: Scope | null, inInput?: boolean } | null)?]>): HotkeyGroup
    /** Every call returns its own independent instance, so several lists can coexist on one page. */
    list(query?: string, options?: ListOptions): HotkeyList
    /** 2D keyboard navigation over a table (rows × cells within a row). Unlike `list()`, every call
     *  returns its own independent instance, so several tables can coexist on one page. */
    grid(rowQuery: string, cellQuery: string, options?: GridOptions): HotkeyGrid

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
    /** Get the user changes: the default combination -> the current one. */
    remapping(): Record<Key, Key>
    /** Apply the full remapping state; a hotkey missing from the map returns to its default combination.
     *  `null`/`{}` clears every remapping. An entry that is not a key combination is dropped - the
     *  map may come from the outside. */
    remapping(map: Record<Key, Key> | null): this

    /** Toggle the help dialog. `null` toggles, true/false forces the state. */
    toggleHelp(show?: boolean | null): this
    /** Toggle the visual hint badges over the elements having a hotkey. `null` toggles, true/false forces the state. */
    toggleHints(show?: boolean | null): this

    /** The focused element, piercing the shadow DOM. */
    activeElement(): HTMLElement | null
    isMac(): boolean
    getSheet(): CSSStyleSheet
}

export default WebHotkeys

declare global {
    interface Window {
        /** Set when the script is loaded with the `?register` parameter. */
        webHotkeys?: WebHotkeys
    }
}
