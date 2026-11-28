import { describe, expect, test } from "bun:test"
import { singleWriteEditSchema, writeCommand } from "../../edit/edit"
import {
	ACTION_LABELS,
	mainEdit,
	newPlanEdit,
	notesEdit,
	planActions,
	renameEdit,
	renameError,
	typedNotesError,
} from "./edits"
import type { PlanRow } from "./rows"

const HASH = `jcs1:sha256:${"ab".repeat(32)}`
const row = (name: string, main = false): PlanRow => ({
	name,
	contentHash: HASH,
	main,
	hasNotes: false,
	projected: true,
})
const argv = (edit: Parameters<typeof singleWriteEditSchema.parse>[0], dryRun = false) =>
	writeCommand(singleWriteEditSchema.parse(edit), dryRun)

describe("a plan's menu", () => {
	test("lists rename, notes, make main, copy and delete, and not make main on the main plan", () => {
		expect(planActions(row("base"))).toEqual(["rename", "notes", "main", "copy", "delete"])
		expect(planActions(row("base", true))).toEqual(["rename", "notes", "copy", "delete"])
		for (const action of planActions(row("base"))) expect(ACTION_LABELS[action]).toBeTruthy()
		expect(ACTION_LABELS.main).toBe("Make this my main plan")
	})
})

describe("the argv of each plan Edit", () => {
	test("rename is scenario rename with the hash the page read", () => {
		const edit = renameEdit(row("early"), " later ")
		expect(argv(edit).argv).toEqual([
			"scenario",
			"rename",
			"early",
			"later",
			"--if-hash",
			HASH,
			"--json",
		])
		expect(argv(edit, true).argv).toEqual([
			"scenario",
			"rename",
			"early",
			"later",
			"--if-hash",
			HASH,
			"--dry-run",
			"--json",
		])
	})

	test("notes go on stdin, and empty notes are a clear", () => {
		expect(argv(notesEdit("early", "Retire at 55.\r\nSell the condo. "))).toEqual({
			argv: ["scenario", "notes", "early", "--file", "-", "--json"],
			stdin: "Retire at 55.\nSell the condo.",
		})
		expect(argv(notesEdit("early", "   \n"), true)).toEqual({
			argv: ["scenario", "notes", "early", "--clear", "--dry-run", "--json"],
		})
	})

	test("main is scenario main", () => {
		expect(argv(mainEdit("early")).argv).toEqual(["scenario", "main", "early", "--json"])
		expect(argv(mainEdit("early"), true).argv).toEqual([
			"scenario",
			"main",
			"early",
			"--dry-run",
			"--json",
		])
	})

	test("a plan from my accounts is the template write under the new name, with no hash and no stdin", () => {
		const edit = newPlanEdit(" fresh ", { from: "accounts" }, "2026-11-25")
		expect(edit).toEqual({ kind: "apply-plan", name: "fresh", template: { asOf: "2026-11-25" } })
		const write = ["scenario", "apply", "fresh", "--template", "--as-of", "2026-11-25"]
		expect(argv(edit)).toEqual({ argv: [...write, "--json"] })
		expect(argv(edit, true)).toEqual({ argv: [...write, "--dry-run", "--json"] })
	})

	test("a copy of a plan is the existing copy-plan", () => {
		const edit = newPlanEdit("fresh", { from: "copy", plan: "base" }, "2026-11-25")
		expect(edit).toEqual({ kind: "copy-plan", from: "base", name: "fresh" })
		expect(argv(edit).argv).toEqual(["scenario", "fork", "base", "fresh", "--json"])
	})
})

describe("what the page checks before it asks traj", () => {
	test("a new name is not the old one, not taken, not empty and not shaped like a flag", () => {
		const stored = ["base", "early"]
		expect(renameError(row("early"), "early", stored)).toMatch(/already the name/)
		expect(renameError(row("early"), "base", stored)).toMatch(/already exists/)
		expect(renameError(row("early"), "  ", stored)).toMatch(/Enter a name/)
		expect(renameError(row("early"), "--help", stored)).toMatch(/cannot start with -/)
		expect(renameError(row("early"), "later", stored)).toBeNull()
	})

	test("notes may be empty, and may not hold a control character or run past 10,000 characters", () => {
		expect(typedNotesError("")).toBeNull()
		expect(typedNotesError("a\nb\tc")).toBeNull()
		expect(typedNotesError("a\u0007b")).toMatch(/control/)
		expect(typedNotesError("x".repeat(10_001))).toMatch(/10000/)
		expect(typedNotesError("x".repeat(10_000))).toBeNull()
	})
})
