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

	test("the nineteen pages are in navigation order, with unique paths", () => {
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
			"/reports/",
			"/optimize/allowances/",
			"/optimize/withdrawals/",
			"/estate/",
			"/cash-flow/",
			"/chance/",
			"/tax/",
			"/ledger/",
			"/health/",
			"/settings/tax/",
			"/settings/assumptions/",
		])
		expect(new Set(ROUTES.map((route) => route.path)).size).toBe(ROUTES.length)
	})

	test("the groups are Home and Net worth, then Plan, then Optimize, then Estate, then Cash flow, then Chance of success, then Tax, then Records, then Settings", () => {
		expect(NAV_GROUPS.map((group) => [group.heading, group.routes.map((r) => r.label)])).toEqual([
			[null, ["Home", "Net worth"]],
			[
				"Plan",
				[
					"Overview",
					"Milestones",
					"Income",
					"Expenses",
					"Assets and debts",
					"FI date",
					"Compare",
					"Reports",
				],
			],
			["Optimize", ["Tax allowances", "Withdrawals"]],
			[null, ["Estate"]],
			[null, ["Cash flow"]],
			[null, ["Chance of success"]],
			[null, ["Tax"]],
			["Records", ["Ledger", "Health"]],
			["Settings", ["Tax profile", "Assumptions"]],
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
			"Reports",
		])
		expect(routesShown(plan, false, true).map((route) => route.label)).toEqual([
			"Overview",
			"Milestones",
			"FI date",
			"Compare",
			"Reports",
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
			"Reports",
		])
	})

	test("the Cash flow page is listed only when the selected plan's projection has the cash flow table", () => {
		expect(routeAt("/cash-flow/")?.icon).toBe("workflow")
		const cashFlow = NAV_GROUPS.find((group) =>
			group.routes.some((route) => route.path === "/cash-flow/"),
		)
		if (cashFlow === undefined) throw new Error("the Cash flow group exists")
		expect(routesShown(cashFlow, true, true, true).map((route) => route.label)).toEqual([
			"Cash flow",
		])
		expect(routesShown(cashFlow, true, true, false)).toEqual([])
	})

	test("the Tax allowances page is listed only when the selected plan has a Levy", () => {
		const optimize = NAV_GROUPS.find((group) => group.heading === "Optimize")
		if (optimize === undefined) throw new Error("the Optimize group exists")
		expect(routeAt("/optimize/allowances/")?.label).toBe("Tax allowances")
		expect(routesShown(optimize, true, true, true, true).map((route) => route.label)).toEqual([
			"Tax allowances",
			"Withdrawals",
		])
		expect(routesShown(optimize, true, true, true, false).map((route) => route.label)).toEqual([
			"Withdrawals",
		])
	})

	test("the Withdrawals page is listed when the selected plan has a document", () => {
		const optimize = NAV_GROUPS.find((group) => group.heading === "Optimize")
		if (optimize === undefined) throw new Error("the Optimize group exists")
		expect(routeAt("/optimize/withdrawals/")?.label).toBe("Withdrawals")
		expect(routesShown(optimize, false, true, true, true)).toEqual([
			expect.objectContaining({ label: "Tax allowances" }),
		])
	})
})

describe("the Estate page", () => {
	test("is listed after Optimize when the selected plan has a document, and not without one", () => {
		const group = NAV_GROUPS.find((one) => one.routes.some((route) => route.path === "/estate/"))
		if (group === undefined) throw new Error("the Estate group exists")
		expect(routeAt("/estate/")?.label).toBe("Estate")
		expect(NAV_GROUPS.indexOf(group)).toBe(
			NAV_GROUPS.findIndex((one) => one.heading === "Optimize") + 1,
		)
		expect(routesShown(group, true).map((route) => route.label)).toEqual(["Estate"])
		expect(routesShown(group, false)).toEqual([])
	})
})
