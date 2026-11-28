import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { NAV_GROUPS, navGroupId, navPath, pageTitle, ROUTES, routeAt, routesShown } from "./routes"

const ROUTES_DIR = join(import.meta.dir, "../../routes")

/** What the navigation shows at its top: each page that belongs to no group, and each group's heading. */
function topLevelEntries(): string[] {
	return NAV_GROUPS.flatMap((group) =>
		group.heading === null ? group.routes.map((route) => route.label) : [group.heading],
	)
}

/** A group by its heading. */
function groupAt(heading: string) {
	const group = NAV_GROUPS.find((one) => one.heading === heading)
	if (group === undefined) throw new Error(`the ${heading} group exists`)
	return group
}

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

	test("the nine top-level entries are Overview, Net worth, Plan, Cash flow, Chance of success, Tax, Optimize, Records and Settings", () => {
		expect(topLevelEntries()).toEqual([
			"Overview",
			"Net worth",
			"Plan",
			"Cash flow",
			"Chance of success",
			"Tax",
			"Optimize",
			"Records",
			"Settings",
		])
	})

	test("the seventeen pages are in navigation order, with unique paths", () => {
		expect(ROUTES.map((route) => route.path)).toEqual([
			"/",
			"/net-worth/",
			"/projection/",
			"/milestones/",
			"/compare/",
			"/reports/",
			"/cash-flow/",
			"/chance/",
			"/tax/",
			"/optimize/allowances/",
			"/optimize/withdrawals/",
			"/estate/",
			"/ledger/",
			"/health/",
			"/settings/tax/",
			"/settings/assumptions/",
			"/settings/display/",
		])
		expect(new Set(ROUTES.map((route) => route.path)).size).toBe(ROUTES.length)
	})

	test("the groups are the five pages that belong to none, then Plan, Optimize, Records and Settings", () => {
		expect(NAV_GROUPS.map((group) => [group.heading, group.routes.map((r) => r.label)])).toEqual([
			[null, ["Overview", "Net worth"]],
			["Plan", ["Plan", "Milestones", "Compare plans", "Reports"]],
			[null, ["Cash flow", "Chance of success", "Tax"]],
			["Optimize", ["Tax allowances", "Withdrawals", "Estate"]],
			["Records", ["Ledger", "Health"]],
			["Settings", ["Tax profile", "Assumptions", "Display"]],
		])
	})

	test("Plan and Optimize start open, and Records and Settings start closed", () => {
		const states = NAV_GROUPS.flatMap((group) =>
			group.heading === null ? [] : [[group.heading, group.collapsible, group.defaultOpen]],
		)
		expect(states).toEqual([
			["Plan", true, true],
			["Optimize", true, true],
			["Records", true, false],
			["Settings", true, false],
		])
	})

	test("a route is found by its path, and an unknown path is none", () => {
		expect(routeAt("/projection/")?.label).toBe("Plan")
		expect(routeAt("/nowhere/")).toBeUndefined()
	})

	test("a group's list has an id its heading button controls", () => {
		expect(navGroupId("Plan")).toBe("nav-pages-plan")
		expect(navGroupId("Tax allowances")).toBe("nav-pages-tax-allowances")
	})

	test("the Milestones page is listed only when the selected plan's projection has milestones", () => {
		const plan = groupAt("Plan")
		expect(routeAt("/milestones/")?.icon).toBe("milestone")
		expect(routesShown(plan, true, false).map((route) => route.label)).toEqual([
			"Plan",
			"Compare plans",
			"Reports",
		])
	})

	test("the Cash flow page is listed only when the selected plan's projection has the cash flow table", () => {
		expect(routeAt("/cash-flow/")?.icon).toBe("workflow")
		const money = NAV_GROUPS.find((group) =>
			group.routes.some((route) => route.path === "/cash-flow/"),
		)
		if (money === undefined) throw new Error("the money group exists")
		expect(routesShown(money, true, true, true).map((route) => route.label)).toEqual([
			"Cash flow",
			"Chance of success",
			"Tax",
		])
		expect(routesShown(money, true, true, false).map((route) => route.label)).toEqual([
			"Chance of success",
			"Tax",
		])
	})

	test("the Tax allowances page is listed only when the selected plan has a Levy", () => {
		const optimize = groupAt("Optimize")
		expect(routeAt("/optimize/allowances/")?.label).toBe("Tax allowances")
		expect(routesShown(optimize, true, true, true, true).map((route) => route.label)).toEqual([
			"Tax allowances",
			"Withdrawals",
			"Estate",
		])
		expect(routesShown(optimize, true, true, true, false).map((route) => route.label)).toEqual([
			"Withdrawals",
			"Estate",
		])
	})

	test("the Settings pages are listed only when the selected plan has a document, but Display always is", () => {
		const settings = groupAt("Settings")
		expect(routesShown(settings, true).map((route) => route.label)).toEqual([
			"Tax profile",
			"Assumptions",
			"Display",
		])
		expect(routesShown(settings, false).map((route) => route.label)).toEqual(["Display"])
	})
})

describe("the Estate page", () => {
	test("is listed last in Optimize when the selected plan has a document, and not without one", () => {
		const optimize = groupAt("Optimize")
		expect(routeAt("/estate/")?.label).toBe("Estate")
		expect(routesShown(optimize, true).map((route) => route.label)).toEqual([
			"Tax allowances",
			"Withdrawals",
			"Estate",
		])
		expect(routesShown(optimize, false)).toEqual([
			expect.objectContaining({ label: "Tax allowances" }),
		])
	})
})

describe("a page opened from a page in the navigation", () => {
	test("stands under its parent, and has a route file of its own that sets its title", () => {
		expect(navPath("/chance/path/")).toBe("/chance/")
		expect(navPath("/chance/")).toBe("/chance/")
		expect(routeAt("/chance/path/")).toBeUndefined()
		const source = readFileSync(join(ROUTES_DIR, "chance/path/+page.svelte"), "utf8")
		expect(source).toContain("Future · Dashboard")
	})

	test("marks the entry its parent page has, though it is not in the navigation", () => {
		for (const path of [
			"/income/",
			"/expenses/",
			"/assets-and-debts/",
			"/fi/",
			"/projection/years/",
			"/household/",
		]) {
			expect(navPath(path)).toBe("/projection/")
		}
		expect(navPath("/routing/")).toBe("/cash-flow/")
		expect(routeAt(navPath("/income/"))?.label).toBe("Plan")
	})

	test("keeps its own title, so the Plan page's label is not printed on it", () => {
		expect(pageTitle("/income/")).toBe("Income")
		expect(pageTitle("/expenses/")).toBe("Expenses")
		expect(pageTitle("/assets-and-debts/")).toBe("Assets and debts")
		expect(pageTitle("/fi/")).toBe("FI date")
		expect(pageTitle("/projection/years/")).toBe("Year by year")
		expect(pageTitle("/household/")).toBe("Household")
		expect(pageTitle("/routing/")).toBe("Where money goes")
		expect(pageTitle("/plans/")).toBe("Plans")
		expect(pageTitle("/projection/")).toBe("Plan")
	})
})
