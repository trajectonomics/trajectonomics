import { describe, expect, test } from "bun:test"
import {
	type Edit,
	editSchema,
	type SingleWriteEdit,
	singleWriteEditSchema,
	writeCommand,
} from "./edit"
import { followCompare, followPlan } from "./follow"
import { rereadSchema } from "./reread"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`
const rename: SingleWriteEdit = {
	kind: "rename-plan",
	name: "early",
	newName: "later",
	contentHash: HASH,
}

describe("each plan Edit is one scenario write", () => {
	test.each([
		rename,
		{ kind: "set-plan-notes", name: "early", notes: "Retire at 55." },
		{ kind: "set-main-plan", name: "early" },
		{ kind: "apply-plan", name: "fresh", template: { asOf: "2026-11-25" } },
	])("%o", (edit) => {
		const parsed = singleWriteEditSchema.parse(edit)
		expect(writeCommand(parsed, false).argv[0]).toBe("scenario")
		expect(writeCommand(parsed, true).argv).toContain("--dry-run")
	})

	test("a new plan is one template write: no document on stdin, no hash, no template read first", () => {
		const parsed = singleWriteEditSchema.parse({
			kind: "apply-plan",
			name: "fresh",
			template: { asOf: "2026-11-25" },
		})
		expect(writeCommand(parsed, false)).toEqual({
			argv: ["scenario", "apply", "fresh", "--template", "--as-of", "2026-11-25", "--json"],
		})
	})
})

describe("the plan Edits are strict", () => {
	test.each([
		["a rename with no hash", { kind: "rename-plan", name: "early", newName: "later" }],
		[
			"a rename to a flag",
			{ kind: "rename-plan", name: "early", newName: "--help", contentHash: HASH },
		],
		[
			"a rename of a flag",
			{ kind: "rename-plan", name: "-h", newName: "later", contentHash: HASH },
		],
		["a rename to nothing", { kind: "rename-plan", name: "early", newName: "", contentHash: HASH }],
		["a rename with a field of its own", { ...rename, force: true }],
		[
			"notes with a control character",
			{ kind: "set-plan-notes", name: "early", notes: "a\u0000b" },
		],
		["notes with a bare carriage return", { kind: "set-plan-notes", name: "early", notes: "a\rb" }],
		[
			"notes past 10,000 characters",
			{ kind: "set-plan-notes", name: "early", notes: "x".repeat(10_001) },
		],
		["notes that are not text", { kind: "set-plan-notes", name: "early", notes: ["a"] }],
		["notes of a flag-shaped plan", { kind: "set-plan-notes", name: "--clear", notes: "x" }],
		["a main plan with a field of its own", { kind: "set-main-plan", name: "early", clear: true }],
		["a main plan named like a flag", { kind: "set-main-plan", name: "--clear" }],
		["a new plan with no As-of", { kind: "apply-plan", name: "fresh", template: {} }],
		[
			"a new plan at a date that is not one",
			{ kind: "apply-plan", name: "fresh", template: { asOf: "--help" } },
		],
		[
			"a new plan that also carries a document",
			{ kind: "apply-plan", name: "fresh", template: { asOf: "2026-11-25" }, document: {} },
		],
		[
			"a new plan that names a hash",
			{ kind: "apply-plan", name: "fresh", contentHash: HASH, template: { asOf: "2026-11-25" } },
		],
	])("refuses %s", (_name, edit) => {
		expect(editSchema.safeParse(edit).success).toBe(false)
	})

	test("notes may hold newlines and tabs, Thai script, and may be empty to clear them", () => {
		for (const notes of ["a\nb\tc", "เกษียณที่ 55", "", "x".repeat(10_000)]) {
			expect(editSchema.safeParse({ kind: "set-plan-notes", name: "early", notes }).success).toBe(
				true,
			)
		}
	})
})

describe("what the server keeps after a plan Edit", () => {
	test("a rename puts the new name where the old one was, and an empty list stays every plan", () => {
		expect(followPlan(["base", "early"], rename)).toEqual(["base", "later"])
		expect(followPlan(["early", "base"], rename)).toEqual(["later", "base"])
		expect(followPlan([], rename)).toEqual([])
		expect(followPlan(["base"], rename)).toEqual(["base"])
	})

	test("a rename carries into a comparison, and nothing else does", () => {
		expect(followCompare({ a: "early", b: "base" }, rename)).toEqual({ a: "later", b: "base" })
		expect(followCompare({ a: "base", b: "early" }, rename)).toEqual({ a: "base", b: "later" })
		expect(followCompare(null, rename)).toBeNull()
		const other: Edit = { kind: "set-main-plan", name: "early" }
		expect(followCompare({ a: "early", b: "base" }, other)).toEqual({ a: "early", b: "base" })
	})

	test("a delete of either plan of a comparison takes the comparison out, and a delete of another leaves it", () => {
		const compare = { a: "early", b: "base" }
		expect(followCompare(compare, { kind: "delete-plan", name: "early" })).toBeNull()
		expect(followCompare(compare, { kind: "delete-plan", name: "base" })).toBeNull()
		expect(followCompare(compare, { kind: "delete-plan", name: "other" })).toEqual(compare)
		expect(followCompare(null, { kind: "delete-plan", name: "early" })).toBeNull()
	})

	test("notes and the main plan change no list, and a new plan joins an explicit one", () => {
		const notes: Edit = { kind: "set-plan-notes", name: "early", notes: "x" }
		const main: Edit = { kind: "set-main-plan", name: "early" }
		const fresh: Edit = { kind: "apply-plan", name: "fresh", template: { asOf: "2026-11-25" } }
		expect(followPlan(["base"], notes)).toEqual(["base"])
		expect(followPlan(["base"], main)).toEqual(["base"])
		expect(followPlan(["base"], fresh)).toEqual(["base", "fresh"])
		expect(followPlan([], fresh)).toEqual([])
	})
})

describe("the reread that adds a plan", () => {
	test("is a plan name alone, or with nothing but the inputs of another reread", () => {
		expect(rereadSchema.safeParse({ addPlan: "early" }).success).toBe(true)
		expect(rereadSchema.safeParse({}).success).toBe(true)
	})

	test.each([
		["a flag as the plan", { addPlan: "--help" }],
		["an empty plan", { addPlan: "" }],
		["a path read beside it", { addPlan: "early", path: { plan: "base", index: 1 } }],
		["a field it does not take", { addPlan: "early", remove: "base" }],
		["the allowance inputs beside it", { addPlan: "early", allowances: null }],
		[
			"the chance inputs beside it",
			{ addPlan: "early", chance: { paths: 10, seed: "0123456789abcdef" } },
		],
	])("refuses %s", (_name, body) => {
		expect(rereadSchema.safeParse(body).success).toBe(false)
	})
})
