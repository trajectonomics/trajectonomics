import { describe, expect, test } from "bun:test"
import { type ItemNames, NO_PEOPLE } from "../item-names"
import { drawerTitle, tryDrawer } from "./drawer"

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

describe("the drawer a face's What-if opens", () => {
	test("keeps the form the face states: a loan's terms or a home or car's values", () => {
		expect(tryDrawer({ id: "loan", loan: true }, "loan")).toEqual({
			id: "loan",
			tryValue: true,
			loan: true,
		})
		expect(tryDrawer({ id: "home", asset: true }, "home")).toEqual({
			id: "home",
			tryValue: true,
			asset: true,
		})
	})

	test("an Account or a Flow tries its own form, with neither flag", () => {
		expect(tryDrawer({ id: "bank", details: true }, "bank")).toEqual({
			id: "bank",
			tryValue: true,
		})
	})

	test("tries the card's id, which the face names, over the drawer's own", () => {
		expect(tryDrawer({ id: "loan", loan: true }, "other")).toEqual({
			id: "other",
			tryValue: true,
			loan: true,
		})
	})
})
