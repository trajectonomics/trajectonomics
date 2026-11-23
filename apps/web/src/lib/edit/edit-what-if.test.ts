import { describe, expect, test } from "bun:test"
import { type Edit, editSchema, writeCommand } from "./edit"
import { followPlan } from "./follow"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

describe("the what-if Edits", () => {
	const sets = [{ path: "flows.salary.amount", value: "90000.50" }]
	const removals = ["flows.gym"]

	test("copy-plan with Overrides is scenario fork --set and --without with --decimal, and a copy without them keeps its argv", () => {
		const edit = editSchema.parse({
			kind: "copy-plan",
			from: "base",
			name: "early",
			sets,
			removals,
		})
		expect(writeCommand(edit, false)).toEqual({
			argv: [
				"scenario",
				"fork",
				"base",
				"early",
				"--without=flows.gym",
				'--set=flows.salary.amount="90000.50"',
				"--decimal",
				"--json",
			],
		})
		expect(writeCommand(edit, true).argv.slice(-2)).toEqual(["--dry-run", "--json"])
		const plain = editSchema.parse({ kind: "copy-plan", from: "base", name: "early" })
		expect(plain).toEqual({
			kind: "copy-plan",
			from: "base",
			name: "early",
			sets: [],
			removals: [],
		})
		expect(writeCommand(plain, false)).toEqual({
			argv: ["scenario", "fork", "base", "early", "--json"],
		})
	})

	test("apply-overrides is scenario apply with the what-if flags and --if-hash, and no document", () => {
		const edit: Edit = { kind: "apply-overrides", name: "early", contentHash: HASH, sets, removals }
		expect(editSchema.safeParse(edit).success).toBe(true)
		expect(writeCommand(edit, false)).toEqual({
			argv: [
				"scenario",
				"apply",
				"early",
				"--without=flows.gym",
				'--set=flows.salary.amount="90000.50"',
				"--decimal",
				"--if-hash",
				HASH,
				"--json",
			],
		})
		expect(writeCommand(edit, true).argv).toContain("--dry-run")
		expect(writeCommand(edit, true).stdin).toBeUndefined()
	})

	test("apply-overrides with no change, a bad hash, a flag-shaped name or an unknown field is refused", () => {
		const base = { kind: "apply-overrides", name: "early", contentHash: HASH, sets, removals }
		expect(editSchema.safeParse({ ...base, sets: [], removals: [] }).success).toBe(false)
		expect(editSchema.safeParse({ ...base, contentHash: "--dry-run" }).success).toBe(false)
		expect(editSchema.safeParse({ ...base, name: "--help" }).success).toBe(false)
		expect(editSchema.safeParse({ ...base, document: {} }).success).toBe(false)
		expect(editSchema.safeParse({ ...base, removals: ["flows"] }).success).toBe(false)
	})

	test("a copy's Override path names the same rules as a what-if: no leading dash, no =, no repeat", () => {
		expect(
			editSchema.safeParse({
				kind: "copy-plan",
				from: "base",
				name: "early",
				sets: [{ path: "-x", value: 1 }],
			}).success,
		).toBe(false)
		expect(
			editSchema.safeParse({
				kind: "copy-plan",
				from: "base",
				name: "early",
				removals: ["flows.a", "flows.a"],
			}).success,
		).toBe(false)
	})

	test("apply-overrides joins the plans the Snapshot projects, as apply-plan does", () => {
		const edit: Edit = { kind: "apply-overrides", name: "early", contentHash: HASH, sets, removals }
		expect(followPlan(["base"], edit)).toEqual(["base", "early"])
		expect(followPlan([], edit)).toEqual([])
	})
})
