import { describe, expect, test } from "bun:test"
import type { Snapshot } from "../../contract"
import { DEMO } from "../what-if/fixtures.test-support"
import { greetingOf } from "./greeting"

/** The Demo with `base` marked as the ledger's main plan, and its holder named when `label` is given. */
function withHolder(label?: string): Snapshot {
	const copy = structuredClone(DEMO)
	const list = copy.reads.scenarios
	if (!list.ok) throw new Error("the Demo lists its plans")
	const base = list.data.scenarios.find((plan) => plan.name === "base")
	if (base === undefined) throw new Error("the Demo has base")
	base.main = true
	const read = copy.reads.documents["base"]
	if (read === undefined || !read.ok) throw new Error("the Demo reads base")
	const holder = read.data.scenario.household?.people.find((person) => person.role === "holder")
	if (holder === undefined) throw new Error("the Demo's base has a holder")
	if (label !== undefined) holder.displayLabel = label
	return copy
}

describe("greetingOf", () => {
	test("greets the holder by name and says the situation is now", () => {
		expect(greetingOf(withHolder("Ao"), 0)).toBe("Hello Ao, this is your current situation")
	})

	test("says the holder's name in a month ahead, in the singular and the plural", () => {
		expect(greetingOf(withHolder("Ao"), 1)).toBe("Hello Ao, this is where you'll be in 1 month")
		expect(greetingOf(withHolder("Ao"), 3)).toBe("Hello Ao, this is where you'll be in 3 months")
	})

	test("says the holder's name in a month behind, in the plural", () => {
		expect(greetingOf(withHolder("Ao"), -2)).toBe("Hello Ao, this is where you were 2 months ago")
	})

	test("says a whole year in years, in the singular and the plural", () => {
		expect(greetingOf(withHolder("Ao"), 12)).toBe("Hello Ao, this is where you'll be in 1 year")
		expect(greetingOf(withHolder("Ao"), -24)).toBe("Hello Ao, this is where you were 2 years ago")
	})

	test("says Hello there when the household states no holder name", () => {
		expect(greetingOf(withHolder(), 0)).toBe("Hello there, this is your current situation")
		expect(greetingOf(withHolder(), 3)).toBe("Hello there, this is where you'll be in 3 months")
	})

	test("says Hello there before the Snapshot is ready, or when no plan is main", () => {
		expect(greetingOf(null, 0)).toBe("Hello there, this is your current situation")
		expect(greetingOf(DEMO, 0)).toBe("Hello there, this is your current situation")
	})
})
