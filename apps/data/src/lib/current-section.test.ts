import { describe, expect, test } from "bun:test"
import { currentSection } from "./current-section"

const SECTIONS = [
	{ id: "plans", top: 200 },
	{ id: "value", top: 900 },
	{ id: "tokens", top: 1600 },
]

describe("currentSection", () => {
	test("starts on the first section", () => {
		expect(currentSection(SECTIONS, false, 120)).toBe("plans")
	})

	test("moves to the last section whose top has passed the line", () => {
		const scrolled = [
			{ id: "plans", top: -600 },
			{ id: "value", top: 100 },
			{ id: "tokens", top: 800 },
		]
		expect(currentSection(scrolled, false, 120)).toBe("value")
	})

	test("takes the last section at the bottom of the page", () => {
		expect(currentSection(SECTIONS, true, 120)).toBe("tokens")
	})

	test("is null before the sections render", () => {
		expect(currentSection([], false, 120)).toBeNull()
	})
})
