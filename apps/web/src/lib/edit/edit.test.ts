import { describe, expect, test } from "bun:test"
import { EDIT_KINDS, type Edit, editSchema, writeCommand } from "./edit"
import { followPlan } from "./follow"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

describe("the Edit list", () => {
	test("is exactly the kinds the Dashboard may send, and no read", () => {
		expect([...EDIT_KINDS]).toEqual([
			"copy-plan",
			"apply-plan",
			"delete-plan",
			"set-household",
			"remove-household",
			"apply-overrides",
			"merge-tax",
			"set-tax",
			"remove-tax",
			"rename-plan",
			"set-plan-notes",
			"set-main-plan",
		])
	})

	test("each Edit is one scenario write, and the schema refuses any other kind", () => {
		for (const kind of ["tx add", "account add", "init", "projection run", "delete-plan-now"]) {
			const parsed = editSchema.safeParse({ kind, name: "x" })
			expect(parsed.success).toBe(false)
		}
		for (const edit of [
			{ kind: "copy-plan", from: "base", name: "early", sets: [], removals: [], additions: [] },
			{ kind: "apply-plan", name: "early", contentHash: HASH, document: {} },
			{ kind: "delete-plan", name: "early" },
			{ kind: "set-household", name: "early", contentHash: HASH, household: { schemaVersion: 1 } },
			{ kind: "remove-household", name: "early", contentHash: HASH },
			{ kind: "merge-tax", name: "early", contentHash: HASH, flags: { children: "2" } },
			{ kind: "set-tax", name: "early", contentHash: HASH, flags: { filingStatus: "single" } },
			{ kind: "remove-tax", name: "early", contentHash: HASH },
			{ kind: "rename-plan", name: "early", newName: "later", contentHash: HASH },
			{ kind: "set-plan-notes", name: "early", notes: "Retire at 55." },
			{ kind: "set-main-plan", name: "early" },
			{ kind: "apply-plan", name: "fresh", template: { asOf: "2026-11-25" } },
		]) {
			expect(editSchema.safeParse(edit).success).toBe(true)
			expect(writeCommand(editSchema.parse(edit), false, "{}").argv[0]).toBe("scenario")
		}
	})

	test("the schema is strict: an extra field or a missing name is refused", () => {
		expect(editSchema.safeParse({ kind: "delete-plan", name: "x", force: true }).success).toBe(
			false,
		)
		expect(editSchema.safeParse({ kind: "copy-plan", from: "base" }).success).toBe(false)
		expect(editSchema.safeParse({ kind: "delete-plan", name: "" }).success).toBe(false)
	})

	test("the schema refuses a flag-shaped name in every field, so traj never reads one as a flag", () => {
		for (const edit of [
			{ kind: "copy-plan", from: "base", name: "--help" },
			{ kind: "copy-plan", from: "--help", name: "early" },
			{ kind: "apply-plan", name: "-h", contentHash: HASH, document: {} },
			{ kind: "delete-plan", name: "--dry-run" },
			{ kind: "set-household", name: "--file", contentHash: HASH, household: {} },
			{ kind: "remove-household", name: "--none", contentHash: HASH },
			{ kind: "delete-plan", name: "a\nb" },
			{ kind: "merge-tax", name: "--none", contentHash: HASH, flags: { children: "2" } },
			{ kind: "set-tax", name: "-h", contentHash: HASH, flags: { filingStatus: "single" } },
			{ kind: "remove-tax", name: "--merge", contentHash: HASH },
		]) {
			expect(editSchema.safeParse(edit).success).toBe(false)
		}
	})

	test("a plan-changing Edit names the hash the page read; a missing or flag-shaped one is refused", () => {
		expect(editSchema.safeParse({ kind: "remove-household", name: "early" }).success).toBe(false)
		for (const contentHash of ["--dry-run", "jcs1:sha256:short"]) {
			expect(
				editSchema.safeParse({ kind: "remove-household", name: "early", contentHash }).success,
			).toBe(false)
		}
	})
})

describe("writeCommand", () => {
	test("copy-plan is scenario fork, with and without --dry-run", () => {
		const edit: Edit = {
			kind: "copy-plan",
			from: "base",
			name: "early",
			sets: [],
			removals: [],
			additions: [],
		}
		expect(writeCommand(edit, false)).toEqual({
			argv: ["scenario", "fork", "base", "early", "--json"],
		})
		expect(writeCommand(edit, true)).toEqual({
			argv: ["scenario", "fork", "base", "early", "--dry-run", "--json"],
		})
	})

	test("delete-plan is scenario rm, with and without --dry-run", () => {
		const edit: Edit = { kind: "delete-plan", name: "early" }
		expect(writeCommand(edit, false)).toEqual({ argv: ["scenario", "rm", "early", "--json"] })
		expect(writeCommand(edit, true)).toEqual({
			argv: ["scenario", "rm", "early", "--dry-run", "--json"],
		})
	})

	test("apply-plan is scenario apply --file - --decimal, and the document goes on stdin", () => {
		const document = { schemaVersion: 4, currency: "THB" }
		const edit: Edit = { kind: "apply-plan", name: "early", contentHash: HASH, document }
		expect(writeCommand(edit, false)).toEqual({
			argv: ["scenario", "apply", "early", "--file", "-", "--decimal", "--if-hash", HASH, "--json"],
			stdin: JSON.stringify(document),
		})
		expect(writeCommand(edit, true).argv).toEqual([
			"scenario",
			"apply",
			"early",
			"--file",
			"-",
			"--decimal",
			"--if-hash",
			HASH,
			"--dry-run",
			"--json",
		])
	})
})

describe("the household Edits", () => {
	const household = { schemaVersion: 1, people: [], anchors: [] }

	test("set-household is scenario household --file -, with the document on stdin, and --dry-run first", () => {
		const edit: Edit = { kind: "set-household", name: "early", contentHash: HASH, household }
		expect(writeCommand(edit, false)).toEqual({
			argv: ["scenario", "household", "early", "--file", "-", "--if-hash", HASH, "--json"],
			stdin: JSON.stringify(household),
		})
		expect(writeCommand(edit, true)).toEqual({
			argv: [
				"scenario",
				"household",
				"early",
				"--file",
				"-",
				"--if-hash",
				HASH,
				"--dry-run",
				"--json",
			],
			stdin: JSON.stringify(household),
		})
	})

	test("remove-household is scenario household --none, with and without --dry-run", () => {
		const edit: Edit = { kind: "remove-household", name: "early", contentHash: HASH }
		expect(writeCommand(edit, false)).toEqual({
			argv: ["scenario", "household", "early", "--none", "--if-hash", HASH, "--json"],
		})
		expect(writeCommand(edit, true)).toEqual({
			argv: ["scenario", "household", "early", "--none", "--if-hash", HASH, "--dry-run", "--json"],
		})
	})

	test("neither changes the list of plans the Snapshot projects", () => {
		expect(
			followPlan(["base", "early"], { kind: "remove-household", name: "early", contentHash: HASH }),
		).toEqual(["base", "early"])
		expect(
			followPlan([], { kind: "set-household", name: "early", contentHash: HASH, household }),
		).toEqual([])
	})
})

describe("followPlan", () => {
	test("a copy or an apply joins an explicit list, and an empty list stays every Scenario", () => {
		const copy: Edit = {
			kind: "copy-plan",
			from: "base",
			name: "early",
			sets: [],
			removals: [],
			additions: [],
		}
		expect(followPlan(["base"], copy)).toEqual(["base", "early"])
		expect(followPlan([], copy)).toEqual([])
		expect(followPlan(["base", "early"], copy)).toEqual(["base", "early"])
	})

	test("a delete leaves the list without its name", () => {
		expect(followPlan(["base", "early"], { kind: "delete-plan", name: "early" })).toEqual(["base"])
		expect(followPlan([], { kind: "delete-plan", name: "early" })).toEqual([])
	})
})
