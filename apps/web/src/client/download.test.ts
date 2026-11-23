import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { printPage, saveFile } from "./download"
import { preferences } from "./preferences.svelte"

// The browser globals this module touches are stubbed here and put back in afterAll: a stub that leaked
// would change every later test file in the same `bun test` process.
type Slot = "window" | "document" | "setTimeout"
const SAVED = {
	window: Object.getOwnPropertyDescriptor(globalThis, "window"),
	document: Object.getOwnPropertyDescriptor(globalThis, "document"),
	setTimeout: Object.getOwnPropertyDescriptor(globalThis, "setTimeout"),
}
const SAVED_URL = {
	create: URL.createObjectURL,
	revoke: URL.revokeObjectURL,
}
const SAVED_HIDDEN = preferences.hidden

function stub(slot: Slot, value: unknown): void {
	Object.defineProperty(globalThis, slot, { value, configurable: true, writable: true })
}

interface Calls {
	confirmed: string[]
	printed: number
	blobs: Blob[]
	revoked: string[]
	links: { href: string; download: string; clicked: boolean; removed: boolean }[]
	timers: (() => void)[]
}

let calls: Calls
let answer = true

beforeEach(() => {
	calls = { confirmed: [], printed: 0, blobs: [], revoked: [], links: [], timers: [] }
	answer = true
	stub("window", {
		confirm: (message: string) => {
			calls.confirmed.push(message)
			return answer
		},
		print: () => {
			calls.printed++
		},
	})
	stub("document", {
		createElement: () => {
			const link = {
				href: "",
				download: "",
				clicked: false,
				removed: false,
			} as Calls["links"][number] & {
				click(): void
				remove(): void
			}
			link.click = () => {
				link.clicked = true
			}
			link.remove = () => {
				link.removed = true
			}
			calls.links.push(link)
			return link
		},
		body: { append: () => {} },
	})
	stub("setTimeout", (run: () => void) => {
		calls.timers.push(run)
		return 0
	})
	URL.createObjectURL = (blob: Blob | MediaSource) => {
		calls.blobs.push(blob as Blob)
		return "blob:stub-1"
	}
	URL.revokeObjectURL = (url: string) => {
		calls.revoked.push(url)
	}
})

afterAll(() => {
	for (const slot of ["window", "document", "setTimeout"] as const) {
		const saved = SAVED[slot]
		if (saved === undefined) Reflect.deleteProperty(globalThis, slot)
		else Object.defineProperty(globalThis, slot, saved)
	}
	URL.createObjectURL = SAVED_URL.create
	URL.revokeObjectURL = SAVED_URL.revoke
	preferences.hidden = SAVED_HIDDEN
})

const file = { name: "base-annual-2026-10-31.csv", type: "text/csv;charset=utf-8", text: "a,b\r\n" }

describe("saveFile", () => {
	test("writes the file under its name, then frees the object URL", async () => {
		preferences.hidden = false
		expect(saveFile(file)).toBe(true)
		expect(calls.confirmed).toEqual([])
		expect(await calls.blobs[0]?.text()).toBe("a,b\r\n")
		expect(calls.blobs[0]?.type).toBe("text/csv;charset=utf-8")
		expect(calls.links).toHaveLength(1)
		expect(calls.links[0]).toMatchObject({
			href: "blob:stub-1",
			download: file.name,
			clicked: true,
			removed: true,
		})
		expect(calls.revoked).toEqual([])
		for (const run of calls.timers) run()
		expect(calls.revoked).toEqual(["blob:stub-1"])
	})

	test("while amounts are hidden, a declined download writes nothing and asks again next time", () => {
		preferences.hidden = true
		answer = false
		expect(saveFile(file)).toBe(false)
		expect(saveFile(file)).toBe(false)
		expect(calls.confirmed).toHaveLength(2)
		expect(calls.blobs).toHaveLength(0)
		expect(calls.links).toHaveLength(0)
	})

	test("while amounts are hidden, it asks once, and an accepted download is not asked about again", () => {
		preferences.hidden = true
		expect(saveFile(file)).toBe(true)
		expect(saveFile(file)).toBe(true)
		expect(calls.confirmed).toHaveLength(1)
		expect(calls.confirmed[0]).toContain("Amounts are hidden")
		expect(calls.blobs).toHaveLength(2)
	})
})

describe("printPage", () => {
	test("opens the print dialog once", () => {
		printPage()
		expect(calls.printed).toBe(1)
	})
})
