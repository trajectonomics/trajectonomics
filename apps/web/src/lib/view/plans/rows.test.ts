import { describe, expect, test } from "bun:test"
import { ledgerWith } from "./fixtures.test-support"
import { mainPlan, planRows, storedNames } from "./rows"

describe("planRows", () => {
	test("lists the main plan first and the rest in the order `scenario list` states them", () => {
		const snapshot = ledgerWith({ alpha: {}, base: {}, "retire-early": { main: true }, zed: {} }, [
			"base",
			"retire-early",
		])
		expect(planRows(snapshot).map((row) => row.name)).toEqual([
			"retire-early",
			"alpha",
			"base",
			"zed",
		])
		expect(mainPlan(snapshot)).toBe("retire-early")
	})

	test("keeps the list's own order when no plan is main", () => {
		const snapshot = ledgerWith({ base: {}, "retire-early": {}, extra: {} })
		expect(planRows(snapshot).map((row) => row.name)).toEqual(["base", "retire-early", "extra"])
		expect(mainPlan(snapshot)).toBeNull()
	})

	test("says which plans the dashboard projects, and which have notes", () => {
		const snapshot = ledgerWith({ base: { notes: "x" }, extra: {} }, ["base"])
		const rows = planRows(snapshot)
		expect(rows.map((row) => [row.name, row.projected, row.hasNotes])).toEqual([
			["base", true, true],
			["extra", false, false],
		])
		expect(storedNames(snapshot)).toEqual(["base", "extra"])
	})

	test("reads a Snapshot saved before main and notes existed as no main plan and no notes", () => {
		const snapshot = ledgerWith({ base: {} })
		const list = snapshot.reads.scenarios
		if (list.ok)
			for (const plan of list.data.scenarios) {
				delete plan.main
				delete plan.hasNotes
			}
		expect(planRows(snapshot).map((row) => [row.main, row.hasNotes])).toEqual([[false, false]])
	})

	test("is empty when the plan list could not be read", () => {
		const snapshot = ledgerWith({ base: {} })
		snapshot.reads.scenarios = {
			argv: ["scenario", "list"],
			ok: false,
			error: { code: "x", exitCode: 1, message: "no" },
		}
		expect(planRows(snapshot)).toEqual([])
		expect(mainPlan(snapshot)).toBeNull()
	})
})
