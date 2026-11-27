import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test"
import { ShellPanels } from "./shell.svelte.js"

// The browser globals the shell touches are stubbed here and put back in afterAll: a stub that leaked
// would change every later test file in the same `bun test` process.
const SAVED_WINDOW = Object.getOwnPropertyDescriptor(globalThis, "window")

class FakeQuery {
	matches = false
	private readonly listeners = new Set<(event: MediaQueryListEvent) => void>()
	constructor(readonly media: string) {}

	addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void): void {
		this.listeners.add(listener)
	}

	removeEventListener(_type: string, listener: (event: MediaQueryListEvent) => void): void {
		this.listeners.delete(listener)
	}

	/** The viewport crosses this query: every listener hears the new answer, as a browser's would. */
	set(matches: boolean): void {
		this.matches = matches
		for (const listener of this.listeners) listener({ matches } as MediaQueryListEvent)
	}
}

class FakeWindow {
	readonly keydown = new Set<(event: { key: string }) => void>()
	readonly queries: FakeQuery[] = []

	addEventListener(type: string, listener: (event: { key: string }) => void): void {
		if (type === "keydown") this.keydown.add(listener)
	}

	removeEventListener(type: string, listener: (event: { key: string }) => void): void {
		if (type === "keydown") this.keydown.delete(listener)
	}

	matchMedia(media: string): MediaQueryList {
		const query = new FakeQuery(media)
		this.queries.push(query)
		return query as unknown as MediaQueryList
	}

	press(key: string): void {
		for (const listener of this.keydown) listener({ key })
	}
}

let browser: FakeWindow
let panels: ShellPanels

beforeEach(() => {
	browser = new FakeWindow()
	Object.defineProperty(globalThis, "window", {
		value: browser,
		configurable: true,
		writable: true,
	})
	panels = new ShellPanels()
})

afterEach(() => {
	panels.closeAll()
})

afterAll(() => {
	if (SAVED_WINDOW === undefined) Reflect.deleteProperty(globalThis, "window")
	else Object.defineProperty(globalThis, "window", SAVED_WINDOW)
})

describe("the shell panels", () => {
	test("closeAll shuts both the menu and Display options", () => {
		panels.openMenu()
		panels.openOptions()
		panels.closeAll()
		expect([panels.menu, panels.options]).toEqual([false, false])
	})

	test("Escape shuts both panels, and another key shuts none", () => {
		panels.openMenu()
		panels.openOptions()
		browser.press("Enter")
		expect([panels.menu, panels.options]).toEqual([true, true])
		browser.press("Escape")
		expect([panels.menu, panels.options]).toEqual([false, false])
	})

	test("following a link shuts the menu and leaves Display options as it was", () => {
		panels.openMenu()
		panels.openOptions()
		panels.closeMenu()
		expect([panels.menu, panels.options]).toEqual([false, true])
	})

	test("shutting Display options leaves the menu as it was", () => {
		panels.openMenu()
		panels.openOptions()
		panels.closeOptions()
		expect([panels.menu, panels.options]).toEqual([true, false])
	})
})

describe("the menu at the lg breakpoint", () => {
	test("shuts when the viewport widens to lg, and stays shut when it narrows again", () => {
		panels.openMenu()
		panels.openOptions()
		const wide = browser.queries[0]
		expect(wide?.media).toBe("(min-width: 64rem)")
		wide?.set(true)
		expect(panels.menu).toBe(false)
		expect(panels.options).toBe(true)
		wide?.set(false)
		expect(panels.menu).toBe(false)
	})

	test("stays open when the viewport narrows without ever matching lg", () => {
		panels.openMenu()
		browser.queries[0]?.set(false)
		expect(panels.menu).toBe(true)
	})
})
