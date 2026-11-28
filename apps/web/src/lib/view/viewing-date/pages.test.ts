import { describe, expect, test } from "bun:test"
import { routeAt } from "../routes"
import { usesViewingDate, VIEWING_PAGES } from "./pages"

describe("the pages that use the viewing date", () => {
	test("starts empty: a page is added only when its slice wires the date", () => {
		expect(VIEWING_PAGES).toEqual([])
	})

	test("names route paths with their trailing slash, each one a route the Dashboard has", () => {
		for (const path of VIEWING_PAGES) {
			expect(routeAt(path)).toBeDefined()
		}
	})

	test("an unnamed path, or one without the trailing slash, does not use the viewing date", () => {
		expect(usesViewingDate("")).toBe(false)
		expect(usesViewingDate("/nowhere/")).toBe(false)
		expect(usesViewingDate("/nowhere")).toBe(false)
	})
})
