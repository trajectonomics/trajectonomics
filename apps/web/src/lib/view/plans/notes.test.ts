import { describe, expect, test } from "bun:test"
import { notesPreview } from "./notes"

describe("notesPreview", () => {
	test("is none for no notes and for notes of nothing but space", () => {
		expect(notesPreview(null)).toBeNull()
		expect(notesPreview(undefined)).toBeNull()
		expect(notesPreview("  \n ")).toBeNull()
	})

	test("one line is its own preview, with nothing to expand", () => {
		expect(notesPreview("Retire at 55.\n")).toEqual({ first: "Retire at 55.", full: null })
	})

	test("more lines show the first and keep the whole text to expand", () => {
		expect(notesPreview("Retire at 55.\nSell the condo.")).toEqual({
			first: "Retire at 55.",
			full: "Retire at 55.\nSell the condo.",
		})
	})
})
