import { describe, expect, test } from "bun:test"
import { editSchema, writeCommand } from "./edit"
import { followPlan } from "./follow"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

describe("the tax profile Edits", () => {
	const merge = (flags: object) => ({ kind: "merge-tax", name: "early", contentHash: HASH, flags })
	const whole = (flags: object) => ({ kind: "set-tax", name: "early", contentHash: HASH, flags })

	test("merge-tax is scenario tax --merge with the items it names, in a fixed order", () => {
		const edit = editSchema.parse(
			merge({ donation1x: "5000", children: "2", filingStatus: "married_joint" }),
		)
		expect(writeCommand(edit, false).argv).toEqual([
			"scenario",
			"tax",
			"early",
			"--merge",
			"--filing-status",
			"married_joint",
			"--children",
			"2",
			"--donation1x",
			"5000",
			"--if-hash",
			HASH,
			"--json",
		])
		expect(writeCommand(edit, true).argv.slice(-2)).toEqual(["--dry-run", "--json"])
	})

	test("set-tax states the whole profile with --tax th-2026", () => {
		const edit = editSchema.parse(
			whole({ filingStatus: "single", childrenAtHigherRate: "1", socialSecurity: "9000.50" }),
		)
		expect(writeCommand(edit, false).argv).toEqual([
			"scenario",
			"tax",
			"early",
			"--tax",
			"th-2026",
			"--filing-status",
			"single",
			"--children-at-higher-rate",
			"1",
			"--social-security",
			"9000.50",
			"--if-hash",
			HASH,
			"--json",
		])
	})

	test("set-tax writes the labels of income Flows as --label <flow>=<label>, after the profile and before the guard", () => {
		const edit = editSchema.parse({
			...whole({ filingStatus: "single" }),
			labels: [
				{ flow: "salary", label: "income.section40_1" },
				{ flow: "side-gig", label: "income.section40_2" },
			],
		})
		expect(writeCommand(edit, false).argv).toEqual([
			"scenario",
			"tax",
			"early",
			"--tax",
			"th-2026",
			"--filing-status",
			"single",
			"--label",
			"salary=income.section40_1",
			"--label",
			"side-gig=income.section40_2",
			"--if-hash",
			HASH,
			"--json",
		])
	})

	test("a label is one of the income labels, on a Flow whose id cannot read as a flag", () => {
		const labelled = (labels: unknown) =>
			editSchema.safeParse({ ...whole({ filingStatus: "single" }), labels }).success
		expect(labelled([{ flow: "salary", label: "income.section40_1" }])).toBe(true)
		expect(labelled([{ flow: "salary", label: "allowance.thai_esg" }])).toBe(false)
		expect(labelled([{ flow: "salary", label: "income.bogus" }])).toBe(false)
		expect(labelled([{ flow: "--none", label: "income.section40_1" }])).toBe(false)
		expect(labelled([{ flow: "a=b", label: "income.section40_1" }])).toBe(false)
		expect(labelled([{ flow: "salary", label: "income.section40_1", extra: 1 }])).toBe(false)
		// A merge carries no labels: the plan already has its tax, and its labels are set in the label form.
		expect(editSchema.safeParse({ ...merge({ children: "2" }), labels: [] }).success).toBe(false)
	})

	test("remove-tax is scenario tax --none, and no tax Edit changes the plans the Snapshot projects", () => {
		const edit = editSchema.parse({ kind: "remove-tax", name: "early", contentHash: HASH })
		expect(writeCommand(edit, true).argv).toEqual([
			"scenario",
			"tax",
			"early",
			"--none",
			"--if-hash",
			HASH,
			"--dry-run",
			"--json",
		])
		expect(followPlan(["base", "early"], edit)).toEqual(["base", "early"])
		expect(followPlan([], editSchema.parse(merge({ children: "1" })))).toEqual([])
	})

	test("a merge that changes nothing, a set with no filing status, and a value shaped as a flag are refused", () => {
		expect(editSchema.safeParse(merge({})).success).toBe(false)
		expect(editSchema.safeParse(whole({ children: "1" })).success).toBe(false)
		for (const flags of [
			{ children: "--none" },
			{ children: "-1" },
			{ children: "1.5" },
			{ socialSecurity: "-5" },
			{ socialSecurity: "1e9" },
			{ socialSecurity: "1,000" },
			{ filingStatus: "--merge" },
			{ unknown: "1" },
		]) {
			expect(editSchema.safeParse(merge(flags)).success, JSON.stringify(flags)).toBe(false)
		}
	})
})
