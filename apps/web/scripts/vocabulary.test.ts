import { describe, expect, test } from "bun:test"
import { unionWordsAt, vocabularyProblems, wordsAt } from "./vocabulary"

const SCHEMA = { a: { b: { enum: ["x", "y"] }, c: "text", d: { enum: [1, 2] } } }
const UNION = {
	kinds: {
		oneOf: [{ properties: { kind: { const: "a" } } }, { properties: { kind: { const: "b" } } }],
	},
}

describe("wordsAt", () => {
	test("reads the words at a path", () => {
		expect(wordsAt(SCHEMA, "a.b.enum")).toEqual(["x", "y"])
	})

	test("is null when the path is gone, or is not a list of words", () => {
		expect(wordsAt(SCHEMA, "a.z.enum")).toBeNull()
		expect(wordsAt(SCHEMA, "a.c")).toBeNull()
		expect(wordsAt(SCHEMA, "a.d.enum")).toBeNull()
		expect(wordsAt(null, "a")).toBeNull()
	})
})

describe("unionWordsAt", () => {
	test("reads a union's discriminator words in branch order", () => {
		expect(unionWordsAt(UNION, "kinds.oneOf")).toEqual(["a", "b"])
	})

	test("is null when the path is gone, or a branch names no word", () => {
		expect(unionWordsAt(UNION, "kinds")).toBeNull()
		expect(unionWordsAt(UNION, "kinds.oneOf.nope")).toBeNull()
		expect(unionWordsAt({ oneOf: [{ properties: {} }] }, "oneOf")).toBeNull()
	})
})

describe("vocabularyProblems", () => {
	const web = ["monthly", "annual"]

	test("a list that follows has no problem", () => {
		expect(vocabularyProblems("frequency", web, ["annual", "monthly"], "same")).toEqual([])
		expect(vocabularyProblems("frequency", web, ["monthly", "annual", "daily"], "within")).toEqual(
			[],
		)
	})

	test("fails when the CLI adds a word a contract enum does not know", () => {
		const problems = vocabularyProblems("frequency", web, ["monthly", "annual", "weekly"], "same")
		expect(problems).toHaveLength(1)
		expect(problems[0]).toContain('frequency: the CLI lists "weekly"')
	})

	test("does not fail when the CLI adds a word a form simply does not offer", () => {
		expect(vocabularyProblems("rounding", web, ["monthly", "annual", "weekly"], "within")).toEqual(
			[],
		)
	})

	test("fails when the web lists a word the CLI no longer does, in either mode", () => {
		for (const follow of ["same", "within"] as const) {
			const problems = vocabularyProblems("frequency", web, ["monthly"], follow)
			expect(problems).toHaveLength(1)
			expect(problems[0]).toContain('the web lists "annual"')
		}
	})
})
