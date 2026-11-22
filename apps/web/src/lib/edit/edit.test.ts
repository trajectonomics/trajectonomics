import { describe, expect, test } from "bun:test"
import { EDIT_KINDS, type Edit, editSchema, followPlan, writeCommand } from "./edit"

describe("the Edit list", () => {
	test("is exactly the kinds the Dashboard may send, and no read", () => {
		expect([...EDIT_KINDS]).toEqual(["copy-plan", "apply-plan", "delete-plan"])
	})

	test("each Edit is one scenario write, and the schema refuses any other kind", () => {
		for (const kind of ["tx add", "account add", "init", "projection run", "delete-plan-now"]) {
			const parsed = editSchema.safeParse({ kind, name: "x" })
			expect(parsed.success).toBe(false)
		}
		for (const edit of [
			{ kind: "copy-plan", from: "base", name: "early" },
			{ kind: "apply-plan", name: "early", document: {} },
			{ kind: "delete-plan", name: "early" },
		]) {
			expect(editSchema.safeParse(edit).success).toBe(true)
			expect(writeCommand(edit as Edit, false).argv[0]).toBe("scenario")
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
			{ kind: "apply-plan", name: "-h", document: {} },
			{ kind: "delete-plan", name: "--dry-run" },
			{ kind: "delete-plan", name: "a\nb" },
		]) {
			expect(editSchema.safeParse(edit).success).toBe(false)
		}
	})
})

describe("writeCommand", () => {
	test("copy-plan is scenario fork, with and without --dry-run", () => {
		const edit: Edit = { kind: "copy-plan", from: "base", name: "early" }
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
		const edit: Edit = { kind: "apply-plan", name: "early", document }
		expect(writeCommand(edit, false)).toEqual({
			argv: ["scenario", "apply", "early", "--file", "-", "--decimal", "--json"],
			stdin: JSON.stringify(document),
		})
		expect(writeCommand(edit, true).argv).toEqual([
			"scenario",
			"apply",
			"early",
			"--file",
			"-",
			"--decimal",
			"--dry-run",
			"--json",
		])
	})
})

describe("followPlan", () => {
	test("a copy or an apply joins an explicit list, and an empty list stays every Scenario", () => {
		const copy: Edit = { kind: "copy-plan", from: "base", name: "early" }
		expect(followPlan(["base"], copy)).toEqual(["base", "early"])
		expect(followPlan([], copy)).toEqual([])
		expect(followPlan(["base", "early"], copy)).toEqual(["base", "early"])
	})

	test("a delete leaves the list without its name", () => {
		expect(followPlan(["base", "early"], { kind: "delete-plan", name: "early" })).toEqual(["base"])
		expect(followPlan([], { kind: "delete-plan", name: "early" })).toEqual([])
	})
})
