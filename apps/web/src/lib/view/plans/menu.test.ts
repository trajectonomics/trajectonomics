import { describe, expect, test } from "bun:test"
import { menuTarget } from "./menu"

// The plan menu's keys (web #701): arrows walk every item, the plans and then "All plans" and "New plan",
// wrapping at the ends, and Home and End jump to the ends.
describe("menuTarget", () => {
	test("ArrowDown and ArrowUp step one item, and wrap at both ends", () => {
		expect(menuTarget("ArrowDown", 0, 3)).toBe(1)
		expect(menuTarget("ArrowDown", 2, 3)).toBe(0)
		expect(menuTarget("ArrowUp", 2, 3)).toBe(1)
		expect(menuTarget("ArrowUp", 0, 3)).toBe(2)
	})

	test("Home and End jump to the first and the last item", () => {
		expect(menuTarget("Home", 2, 3)).toBe(0)
		expect(menuTarget("End", 0, 3)).toBe(2)
	})

	test("focus outside the items enters at the end the key names", () => {
		expect(menuTarget("ArrowDown", -1, 3)).toBe(0)
		expect(menuTarget("ArrowUp", -1, 3)).toBe(2)
		expect(menuTarget("Home", -1, 3)).toBe(0)
		expect(menuTarget("End", -1, 3)).toBe(2)
	})

	test("moves nothing for another key, and nothing in an empty menu", () => {
		expect(menuTarget("Enter", 0, 3)).toBeNull()
		expect(menuTarget("Tab", 0, 3)).toBeNull()
		expect(menuTarget("ArrowDown", 0, 0)).toBeNull()
		expect(menuTarget("Home", -1, 0)).toBeNull()
	})
})
