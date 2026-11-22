import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { NAV_GROUPS, ROUTES, routeAt, routesShown } from "./routes"

const ROUTES_DIR = join(import.meta.dir, "../../routes")

describe("the navigation's routes", () => {
	test("every route in the navigation has a Svelte route file that sets its title", () => {
		for (const route of ROUTES) {
			const file = join(ROUTES_DIR, route.path === "/" ? "" : route.path, "+page.svelte")
			expect(existsSync(file), `${route.path} has a route file`).toBe(true)
			const source = readFileSync(file, "utf8")
			expect(source, `${route.path} sets the title ${route.label} · Dashboard`).toContain(
				`${route.label} · Dashboard`,
			)
		}
	})

	test("the root layout prerenders static shells with no server rendering, and trailing slashes", () => {
		const layout = readFileSync(join(ROUTES_DIR, "+layout.ts"), "utf8")
		expect(layout).toContain("export const prerender = true")
		expect(layout).toContain("export const ssr = false")
		expect(layout).toContain('export const trailingSlash = "always"')
	})

	test("the thirteen pages are in navigation order, with unique paths", () => {
		expect(ROUTES.map((route) => route.path)).toEqual([
			"/",
			"/net-worth/",
			"/projection/",
			"/milestones/",
			"/income/",
			"/expenses/",
			"/assets-and-debts/",
			"/fi/",
			"/compare/",
			"/chance/",
			"/tax/",
			"/ledger/",
			"/health/",
		])
		expect(new Set(ROUTES.map((route) => route.path)).size).toBe(ROUTES.length)
	})

	test("the groups are Home and Net worth, then Plan, then Chance of success, then Tax, then Records", () => {
		expect(NAV_GROUPS.map((group) => [group.heading, group.routes.map((r) => r.label)])).toEqual([
			[null, ["Home", "Net worth"]],
			[
				"Plan",
				["Overview", "Milestones", "Income", "Expenses", "Assets and debts", "FI date", "Compare"],
			],
			[null, ["Chance of success"]],
			[null, ["Tax"]],
			["Records", ["Ledger", "Health"]],
		])
	})

	test("a route is found by its path, and an unknown path is none", () => {
		expect(routeAt("/fi/")?.label).toBe("FI date")
		expect(routeAt("/nowhere/")).toBeUndefined()
	})

	test("the planner pages need a plan's document, so a Snapshot without one hides them", () => {
		const plan = NAV_GROUPS.find((group) => group.heading === "Plan")
		if (plan === undefined) throw new Error("the Plan group exists")
		expect(routesShown(plan, true, true).map((route) => route.label)).toEqual([
			"Overview",
			"Milestones",
			"Income",
			"Expenses",
			"Assets and debts",
			"FI date",
			"Compare",
		])
		expect(routesShown(plan, false, true).map((route) => route.label)).toEqual([
			"Overview",
			"Milestones",
			"FI date",
			"Compare",
		])
	})

	test("the Milestones page is listed after Overview only when the plan has milestones", () => {
		const plan = NAV_GROUPS.find((group) => group.heading === "Plan")
		if (plan === undefined) throw new Error("the Plan group exists")
		expect(routeAt("/milestones/")?.icon).toBe("milestone")
		expect(routesShown(plan, true, false).map((route) => route.label)).toEqual([
			"Overview",
			"Income",
			"Expenses",
			"Assets and debts",
			"FI date",
			"Compare",
		])
	})
})
