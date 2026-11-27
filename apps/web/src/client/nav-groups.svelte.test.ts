import { describe, expect, test } from "bun:test"
import { NavGroups, navGroupKey } from "./nav-groups.svelte.js"

/** Storage that answers like the browser's and records each write, and a writer that refuses every write. */
function storage(initial: Readonly<Record<string, string>> = {}) {
	const values = new Map(Object.entries(initial))
	return {
		values,
		read: (key: string) => values.get(key) ?? null,
		write: (key: string, value: string) => {
			values.set(key, value)
		},
		refuse: (_key: string, _value: string) => {},
	}
}

describe("the navigation groups' open state", () => {
	test("starts each group at its own default when nothing is stored", () => {
		const store = storage()
		const groups = new NavGroups(store.read, store.write)
		expect(groups.isOpen("Plan", true)).toBe(true)
		expect(groups.isOpen("Records", false)).toBe(false)
	})

	test("keeps a stored choice, so a group closed before a reload is still closed after it", () => {
		const store = storage({ [navGroupKey("Plan")]: "0" })
		const groups = new NavGroups(store.read, store.write)
		expect(groups.isOpen("Plan", true)).toBe(false)
	})

	test("stores a toggle under traj.nav.<heading>, and a new instance reads it back", () => {
		const store = storage()
		new NavGroups(store.read, store.write).toggle("Records", false)
		expect(store.values.get(navGroupKey("Records"))).toBe("1")
		expect(new NavGroups(store.read, store.write).isOpen("Records", false)).toBe(true)
	})

	test("closes a group that starts open, and a new instance reads that back too", () => {
		const store = storage()
		new NavGroups(store.read, store.write).toggle("Plan", true)
		expect(store.values.get(navGroupKey("Plan"))).toBe("0")
		expect(new NavGroups(store.read, store.write).isOpen("Plan", true)).toBe(false)
	})

	test("keeps the state for this page when the browser refuses the write", () => {
		const store = storage()
		const groups = new NavGroups(store.read, store.refuse)
		groups.toggle("Records", false)
		expect(groups.isOpen("Records", false)).toBe(true)
		expect(new NavGroups(store.read, store.refuse).isOpen("Records", false)).toBe(false)
	})

	test("turns a group back over, and a refused write still turns it back", () => {
		const groups = new NavGroups(storage().read, storage().refuse)
		groups.toggle("Plan", true)
		expect(groups.isOpen("Plan", true)).toBe(false)
		groups.toggle("Plan", true)
		expect(groups.isOpen("Plan", true)).toBe(true)
	})

	test("does nothing to a group that holds the current page, and stores no choice for it", () => {
		const store = storage()
		const groups = new NavGroups(store.read, store.write)
		groups.toggle("Records", false, true)
		expect(store.values.has(navGroupKey("Records"))).toBe(false)
		expect(groups.isOpen("Records", false)).toBe(false)
	})
})
