import { describe, expect, test } from "bun:test"
import { type ItemNames, NO_PEOPLE } from "../item-names"
import { drawerTitle } from "./drawer"

/** The lookup the drawer heading reads: a labelled Flow, a named Account, and nothing else. */
const NAMES: ItemNames = {
	accounts: new Map([["bank", "Bank A"]]),
	people: NO_PEOPLE,
	flows: new Map([["salary", "My salary"]]),
	milestones: new Map(),
}

describe("the drawer's heading", () => {
	test("names a Flow by the display label a Read states", () => {
		expect(drawerTitle({ id: "salary" }, "income", NAMES, "flow")).toBe("Edit My salary")
	})

	test("keeps a Flow's id when the document states no label", () => {
		expect(drawerTitle({ id: "rent" }, "expense", NAMES, "flow")).toBe("Edit rent")
	})

	test("names an Account by the ledger's name, and a loan's Account the same way", () => {
		expect(drawerTitle({ id: "bank" }, "account", NAMES, "account")).toBe("Edit Bank A")
		expect(drawerTitle({ id: "bank", loan: true }, "account", NAMES, "account")).toBe(
			"Edit loan Bank A",
		)
	})

	test("says Add when no item is open, and What if… for a What-if", () => {
		expect(drawerTitle({}, "expense", NAMES, "flow")).toBe("Add expense")
		expect(drawerTitle({ id: "salary", tryValue: true }, "income", NAMES, "flow")).toBe(
			"What if… My salary",
		)
	})
})
