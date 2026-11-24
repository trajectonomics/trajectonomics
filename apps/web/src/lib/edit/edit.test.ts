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
			"record-values",
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

describe("record-values", () => {
	const edit: Edit = {
		kind: "record-values",
		against: "gains-id",
		values: [{ account: "bank-id", date: "2026-10-31", value: "1,000.5" }],
	}

	test("is account value --file -, with the batch as typed on stdin, and --dry-run first", () => {
		const stdin = JSON.stringify({ against: "gains-id", values: edit.values })
		expect(writeCommand(edit, false)).toEqual({
			argv: ["account", "value", "--file", "-", "--json"],
			stdin,
		})
		expect(writeCommand(edit, true)).toEqual({
			argv: ["account", "value", "--file", "-", "--dry-run", "--json"],
			stdin,
		})
	})

	test("changes no plan the Snapshot projects", () => {
		expect(followPlan(["base"], edit)).toEqual(["base"])
		expect(followPlan([], edit)).toEqual([])
	})

	test("a preview is the same dry-run argv and stdin, so it runs the write rolled back and nothing else", () => {
		const preview = editSchema.parse({ ...edit, preview: true })
		expect(preview).toMatchObject({ preview: true })
		const dry = writeCommand(edit, true)
		expect(writeCommand(preview, true)).toEqual(dry)
		expect(dry.argv).toContain("--dry-run")
		// The preview flag is never a flag or a field traj sees: the document on stdin is the batch alone.
		expect(JSON.parse(dry.stdin ?? "null")).toEqual({ against: "gains-id", values: edit.values })
	})

	test("preview is true or absent: false is refused", () => {
		expect(editSchema.safeParse({ ...edit, preview: false }).success).toBe(false)
		expect(editSchema.safeParse({ ...edit, preview: "yes" }).success).toBe(false)
	})
})
