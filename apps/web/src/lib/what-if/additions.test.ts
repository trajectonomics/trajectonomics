import { describe, expect, test } from "bun:test"
import { editSchema, singleWriteEditSchema, writeCommand } from "../edit/edit"
import type { Addition } from "./additions"
import { plannedWhatIfReads } from "./argv"
import { whatIfSchema } from "./overrides"
import { changesOf, hasChanges, overridesOf, startWhatIf } from "./session"
import { withAddition, withoutAddition } from "./session-items"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const FLOW = {
	id: "rmf-fund-rmf-2026",
	kind: "contribution",
	funding: "obligation",
	frequency: "once",
	label: "allowance.retirement.rmf",
	amount: "170000.00",
	growth: { bps: 0 },
	start: "2026-12-15",
	target: "rmf-fund",
}
const ADD: Addition = { list: "flows", item: FLOW }
const PARAMS = {
	asOf: "2026-10-31",
	horizon: "2030-12-31",
	scenarios: ["base"],
	compare: null,
	birthDate: null,
	ages: [],
	monthly: false,
	carryIn: false,
	chance: null,
	allowances: null,
	futures: true,
	readPaths: false,
}

describe("the what-if body with Additions", () => {
	test("accepts an item added to flows, accounts or milestones, and a body with none reads as none", () => {
		const body = { plan: "base", sets: [], removals: [], additions: [ADD] }
		expect(whatIfSchema.safeParse(body).success).toBe(true)
		expect(whatIfSchema.parse({ plan: "base", sets: [], removals: [] }).additions).toEqual([])
	})

	test.each([
		["a list that is not one of the three", { list: "levies", item: FLOW }],
		["an item with no id", { list: "flows", item: { kind: "expense" } }],
		["an id that starts with -", { list: "flows", item: { ...FLOW, id: "--help" } }],
		["an id with a control character", { list: "flows", item: { ...FLOW, id: "a\nb" } }],
		["an id over 100 characters", { list: "flows", item: { ...FLOW, id: "x".repeat(101) } }],
		["a field beside list and item", { list: "flows", item: FLOW, extra: 1 }],
	])("refuses %s", (_name, addition) => {
		const body = { plan: "base", sets: [], removals: [], additions: [addition] }
		expect(whatIfSchema.safeParse(body).success).toBe(false)
	})

	test("refuses the same item added twice, since traj refuses an id that exists", () => {
		const body = { plan: "base", sets: [], removals: [], additions: [ADD, ADD] }
		expect(whatIfSchema.safeParse(body).success).toBe(false)
	})
})

describe("the reads of a what-if with Additions", () => {
	test("each Addition is one --add=<list>=<json> token, after the removals and before the sets", () => {
		const reads = plannedWhatIfReads(PARAMS, {
			plan: "base",
			sets: [{ path: "flows.salary.amount", value: "90000.00" }],
			removals: ["flows.gym"],
			additions: [ADD],
		})
		const overrides = reads.projection.argv.filter((token) => /^--(without|add|set)=/.test(token))
		expect(overrides).toEqual([
			"--without=flows.gym",
			`--add=flows=${JSON.stringify(FLOW)}`,
			'--set=flows.salary.amount="90000.00"',
		])
		expect(reads.projection.argv).toContain("--decimal")
	})
})

describe("the Edits that keep Additions", () => {
	test("copy-plan and apply-overrides carry --add in the order traj applies them", () => {
		const copy = singleWriteEditSchema.parse({
			kind: "copy-plan",
			from: "base",
			name: "early",
			additions: [ADD],
		})
		expect(writeCommand(copy, false).argv).toEqual([
			"scenario",
			"fork",
			"base",
			"early",
			`--add=flows=${JSON.stringify(FLOW)}`,
			"--decimal",
			"--json",
		])
		const apply = singleWriteEditSchema.parse({
			kind: "apply-overrides",
			name: "base",
			contentHash: HASH,
			sets: [],
			removals: [],
			additions: [ADD],
		})
		expect(writeCommand(apply, true).argv).toEqual([
			"scenario",
			"apply",
			"base",
			`--add=flows=${JSON.stringify(FLOW)}`,
			"--decimal",
			"--if-hash",
			HASH,
			"--dry-run",
			"--json",
		])
	})

	test("an apply of nothing is still refused, and an Addition alone is a change", () => {
		const none = {
			kind: "apply-overrides",
			name: "base",
			contentHash: HASH,
			sets: [],
			removals: [],
		}
		expect(editSchema.safeParse(none).success).toBe(false)
		expect(editSchema.safeParse({ ...none, additions: [ADD] }).success).toBe(true)
	})
})

describe("the session's Additions", () => {
	test("an Addition is a change on its own, listed by its path, and goes to the server with the others", () => {
		const session = withAddition(startWhatIf("base", HASH), ADD)
		expect(hasChanges(session)).toBe(true)
		expect(changesOf(session)).toEqual([
			{
				kind: "add",
				path: "flows.rmf-fund-rmf-2026",
				label: "Added RMF contribution, 2026",
				title: "Added flow rmf-fund-rmf-2026",
			},
		])
		expect(overridesOf(session).additions).toEqual([ADD])
	})

	test("adding the same item again replaces it in its place, and taking it out ends the change", () => {
		const first = withAddition(startWhatIf("base", HASH), ADD)
		const again = withAddition(first, { ...ADD, item: { ...FLOW, amount: "1.00" } })
		expect(again.additions).toHaveLength(1)
		expect(again.additions[0]?.item["amount"]).toBe("1.00")
		expect(hasChanges(withoutAddition(again, "flows.rmf-fund-rmf-2026"))).toBe(false)
	})
})
