import { describe, expect, test } from "bun:test"
import { noteAnchor } from "./notes"

describe("noteAnchor", () => {
	test("gives two names that differ only in punctuation different anchors", () => {
		expect(noteAnchor("a b", 0)).not.toBe(noteAnchor("a-b", 0))
	})

	test("keeps an anchor URL-safe and scoped by its index", () => {
		expect(noteAnchor("a b/c", 3)).toMatch(/^note-[0-9a-f]+-3$/)
		expect(noteAnchor("base", 0)).not.toBe(noteAnchor("base", 1))
	})
})
