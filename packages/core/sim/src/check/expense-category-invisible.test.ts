import { describe, expect, it } from "bun:test"
import { problemsOf, withCategory } from "./expense-category-support"

const REFUSED = ["scenario/flows/0/category INVALID_CATEGORY"]

describe("a blank or invisible category is refused, so the breakdown groups exactly what a reader sees", () => {
	const refused: [string, string][] = [
		["a space", " "],
		["a run of spaces", "   "],
		["a no-break space alone", "\u00a0"],
		["an ideographic space alone", "\u3000"],
		["a trailing space", "a "],
		["a leading space", " a"],
		["a trailing no-break space", "a\u00a0"],
		["a leading ideographic space", "\u3000a"],
		["a line separator", "a\u2028b"],
		["a paragraph separator", "a\u2029b"],
		["a zero-width space", "a\u200bb"],
		["a zero-width non-joiner", "a\u200cb"],
		["a zero-width joiner", "a\u200db"],
		["a byte order mark", "a\ufeffb"],
		["a leading byte order mark", "\ufeffa"],
		["a left-to-right embedding", "a\u202ab"],
		["a right-to-left override", "a\u202eb"],
		["a left-to-right isolate", "a\u2066b"],
		["a pop directional isolate", "a\u2069b"],
		["a lone high surrogate", "a\ud800b"],
		["a lone low surrogate", "a\udc00b"],
		["a trailing lone high surrogate", "a\ud83d"],
		["a family emoji, which joins with U+200D", "\u{1F468}\u200d\u{1F469}\u200d\u{1F467}"],
	]

	it.each(refused)("refuses %s as INVALID_CATEGORY", (_name, category) => {
		expect(problemsOf(withCategory(category))).toEqual(REFUSED)
	})

	it("refuses the edges of each refused range, and only them", () => {
		const edges: [number, boolean][] = [
			[0x2027, false],
			[0x2028, true],
			[0x2029, true],
			[0x202a, true],
			[0x202e, true],
			[0x202f, false],
			[0x200a, false],
			[0x200b, true],
			[0x200d, true],
			[0x200e, false],
			[0x2065, false],
			[0x2066, true],
			[0x2069, true],
			[0x206a, false],
			[0xfefe, false],
			[0xfeff, true],
			[0xd7ff, false],
			[0xe000, false],
		]
		for (const [code, isRefused] of edges) {
			const category = `a${String.fromCodePoint(code)}b`
			expect(problemsOf(withCategory(category))).toEqual(isRefused ? REFUSED : [])
		}
	})

	it("keeps a single space inside a category", () => {
		expect(problemsOf(withCategory("eating out"))).toEqual([])
	})

	it("refuses 64 code points that end in a space", () => {
		expect(problemsOf(withCategory(`${"a".repeat(63)} `))).toEqual(REFUSED)
	})

	it("groups the breakdown exactly: 'a' and 'a ' can no longer be two groups", () => {
		expect(problemsOf(withCategory("a"))).toEqual([])
		expect(problemsOf(withCategory("a "))).toEqual(REFUSED)
	})
})

describe("ordinary non-ASCII categories still pass", () => {
	const accepted: [string, string][] = [
		["Thai", "ค่าอาหาร"],
		["Thai with a combining mark and a space inside", "ค่า เดินทาง"],
		["accented Latin", "Café crème"],
		["a decomposed accent", "Cafe\u0301"],
		["one emoji", "🙂"],
		["an emoji with a skin tone", "👍🏽"],
		["a flag", "🇹🇭"],
		["CJK", "食費"],
		["Arabic, which is written right to left", "طعام"],
		["Hebrew", "מזון"],
	]

	it.each(accepted)("accepts %s", (_name, category) => {
		expect(problemsOf(withCategory(category))).toEqual([])
	})
})
