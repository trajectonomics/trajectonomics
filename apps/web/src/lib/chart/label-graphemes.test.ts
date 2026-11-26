import { describe, expect, test } from "bun:test"
import { graphemes } from "./label-graphemes"

/** The estimated width of one grapheme in the chart's 12px text. */
function width(text: string, code = false): number {
	return graphemes(text, code)[0]?.width ?? 0
}

describe("the grapheme estimate", () => {
	test("restores the 7px default for a letter it does not list, such as a Cyrillic capital", () => {
		expect(width("Ж")).toBe(7)
		expect(width("щ")).toBe(7)
	})

	test("counts CJK punctuation at a full em by its script extensions, and the enclosed CJK block", () => {
		// ー and ・ are Script=Common but extend Katakana and Hiragana, and ㈱ is U+3200-33FF.
		for (const character of ["ー", "・", "㈱", "家", "ア", "한"]) {
			expect(width(character), character).toBe(12)
		}
	})

	test("counts a capital at 10px and the wide ones at 12px", () => {
		expect(width("S")).toBe(10)
		expect(width("M")).toBe(12)
		expect(width("W")).toBe(12)
		// SUBSCRIPTIONS is 13 capitals: 130px, which fits the 360px diagram with a normal amount.
		expect(graphemes("SUBSCRIPTIONS", false).reduce((sum, part) => sum + part.width, 0)).toBe(130)
	})

	test("counts a family emoji once, as one grapheme, not once per pictograph", () => {
		expect(width("👨‍👩‍👧‍👦")).toBe(14)
		expect(width("👨‍👩‍👧‍👦", true)).toBe(14)
	})

	test("keeps the monospace cell at 7px so a code label reserves what it did", () => {
		expect(width("a", true)).toBe(7)
		expect(width("Ж", true)).toBe(7)
	})
})
