import { describe, expect, test } from "bun:test"
import { writeCommand } from "./edit"
import {
	guidedApplyCommand,
	guidedHouseholdCommand,
	guidedRemoveCommand,
	guidedTemplateRead,
} from "./edit-guided"
import { followPlan } from "./follow"
import { type GuidedEdit, guidedEditSchema, guidedHousehold } from "./guided-edit"

const PEOPLE = [{ id: "me", role: "holder", born: "1990-06", lifeExpectancy: 90 }]

/** A guided plan's answers, parsed, from the history rows. */
const HISTORY: GuidedEdit = guidedEditSchema.parse({
	kind: "start-guided-plan",
	name: "guided",
	asOf: "2026-11-15",
	money: { from: "history", rows: [{ id: "salary", keep: true, amount: "52000" }] },
	people: PEOPLE,
	stopWork: { person: "me", age: 60 },
})

/** The same plan on the totals path. */
const TOTALS: GuidedEdit = guidedEditSchema.parse({
	...HISTORY,
	money: { from: "totals", income: "40000", spending: "18000.50" },
})

const DOCUMENT = { schemaVersion: 4, currency: "THB", flows: [] }
const HOUSEHOLD = guidedHousehold(HISTORY)
const flags = (dryRun: boolean) => (dryRun ? ["--dry-run", "--json"] : ["--json"])

describe("the guided plan's argv", () => {
	test("the history template is read from the ledger's run-rates, in decimal form", () => {
		expect(guidedTemplateRead(HISTORY)).toEqual([
			"scenario",
			"apply",
			"--template",
			"--as-of",
			"2026-11-15",
			"--from-history",
			"--decimal",
			"--json",
		])
	})

	test("the totals template is the same read without --from-history", () => {
		expect(guidedTemplateRead(TOTALS)).toEqual([
			"scenario",
			"apply",
			"--template",
			"--as-of",
			"2026-11-15",
			"--decimal",
			"--json",
		])
	})

	test("the apply is scenario apply --file - --decimal, with the document on stdin, dry first", () => {
		expect(guidedApplyCommand("guided", DOCUMENT, true)).toEqual({
			argv: ["scenario", "apply", "guided", "--file", "-", "--decimal", ...flags(true)],
			stdin: JSON.stringify(DOCUMENT),
		})
		expect(guidedApplyCommand("guided", DOCUMENT, false)).toEqual({
			argv: ["scenario", "apply", "guided", "--file", "-", "--decimal", ...flags(false)],
			stdin: JSON.stringify(DOCUMENT),
		})
	})

	test("the household is scenario household --file -, with no --if-hash, dry first", () => {
		const stdin = JSON.stringify(HOUSEHOLD)
		expect(guidedHouseholdCommand("guided", HOUSEHOLD, true)).toEqual({
			argv: ["scenario", "household", "guided", "--file", "-", ...flags(true)],
			stdin,
		})
		expect(guidedHouseholdCommand("guided", HOUSEHOLD, false)).toEqual({
			argv: ["scenario", "household", "guided", "--file", "-", ...flags(false)],
			stdin,
		})
		expect(guidedHouseholdCommand("guided", HOUSEHOLD, false).argv).not.toContain("--if-hash")
	})

	test("the removal of a refused plan's household is a real scenario rm", () => {
		expect(guidedRemoveCommand("guided")).toEqual(["scenario", "rm", "guided", "--json"])
	})

	test("writeCommand refuses the kind: the guided run builds three writes, not one", () => {
		expect(() => writeCommand(HISTORY, false)).toThrow(/serve-guided/)
	})

	test("the new plan joins an explicit list of the plans the Snapshot projects", () => {
		expect(followPlan(["base"], HISTORY)).toEqual(["base", "guided"])
		expect(followPlan([], HISTORY)).toEqual([])
	})
})

describe("the guided plan's answers", () => {
	/** Whether the schema refuses an Edit that changes `patch` of the history one. */
	function refused(patch: Record<string, unknown>): boolean {
		return !guidedEditSchema.safeParse({ ...HISTORY, ...patch }).success
	}

	test("the schema is strict: an unknown field is refused at every level", () => {
		expect(refused({ extra: true })).toBe(true)
		expect(refused({ money: { ...HISTORY.money, extra: true } })).toBe(true)
		expect(
			refused({
				money: { from: "history", rows: [{ id: "salary", keep: true, extra: true }] },
			}),
		).toBe(true)
		expect(refused({ stopWork: { person: "me", age: 60, extra: true } })).toBe(true)
		expect(refused({ money: { from: "totals", income: "1", spending: "2", extra: true } })).toBe(
			true,
		)
	})

	test("a typed amount is digits with at most two places, never a grouped or negative string", () => {
		const withAmount = (amount: string) => ({
			money: { from: "history", rows: [{ id: "salary", keep: true, amount }] },
		})
		for (const amount of ["52000", "52000.5", "0.01"]) {
			expect(refused(withAmount(amount))).toBe(false)
		}
		for (const amount of ["52,000", "-1", "1.234", ""])
			expect(refused(withAmount(amount))).toBe(true)
	})

	test("a row needs its keep flag, and there is one to 500 of them", () => {
		expect(refused({ money: { from: "history", rows: [{ id: "salary" }] } })).toBe(true)
		expect(refused({ money: { from: "history", rows: [] } })).toBe(true)
		const rows = Array.from({ length: 501 }, (_, index) => ({ id: `row-${index}`, keep: true }))
		expect(refused({ money: { from: "history", rows } })).toBe(true)
	})

	test("the stop-work age is a whole number from 0 to 150, and the person is named", () => {
		for (const age of [-1, 151, 60.5])
			expect(refused({ stopWork: { person: "me", age } })).toBe(true)
		expect(refused({ stopWork: { person: "", age: 60 } })).toBe(true)
		expect(refused({ stopWork: { person: "me", age: 150 } })).toBe(false)
	})

	test("the household holds one to twenty people, and a plan name never starts with -", () => {
		expect(refused({ people: [] })).toBe(true)
		expect(refused({ people: Array.from({ length: 21 }, () => PEOPLE[0]) })).toBe(true)
		expect(refused({ name: "--help" })).toBe(true)
		expect(refused({ name: "guided" })).toBe(false)
	})
})
