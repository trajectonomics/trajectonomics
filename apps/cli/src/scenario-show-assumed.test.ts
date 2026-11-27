// `scenario show` states the values a plan assumes that nobody stated (cli ADR-0083).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { SALARY, tax } from "./scenario-tax-profile-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

type AssumedItem = {
	kind: string
	path: string
	value: number | number[] | null
	status?: "reported" | "unsourced"
	note?: string
	hint: string | null
}

type TaxFigureEntry = {
	path: string
	value: number | number[]
	status: "reported" | "unsourced" | undefined
	note: string | undefined
}

type Shown = {
	document: Record<string, unknown>
	tax: Record<string, unknown> | null
	taxed: boolean
	taxAllowances?: { stated: string[]; notStated: string[] }
	assumed: AssumedItem[]
}

/** What `scenario show` states for the plan `base`. */
async function shown(home: string): Promise<Shown> {
	const res = await scenario(home, ["show", "base"])
	expect(res.code).toBe(0)
	return resultOf(res).scenario as Shown
}

/** Two income Flows added after the Levy was written, so they carry no tax label. */
async function addUnlabelledFlows(home: string): Promise<void> {
	const document = (await shown(home)).document as { flows: Record<string, unknown>[] }
	const salary = document.flows.find((flow) => flow["id"] === "salary") ?? {}
	const { label: _label, ...unlabelled } = salary
	const applied = await applyScenario(home, "base", {
		...document,
		flows: [...document.flows, { ...unlabelled, id: "bonus" }, { ...unlabelled, id: "gift" }],
	})
	expect(applied.code).toBe(0)
}

function ofKind(items: readonly AssumedItem[], kind: string): AssumedItem[] {
	return items.filter((item) => item.kind === kind)
}

describe("scenario show states what a plan assumes", () => {
	it("lists each income Flow with no string label, in document order, with the hint that states one", async () => {
		const home = await projectionHome()
		expect((await tax(home, ["base", "--tax", "th-2026", ...SALARY])).code).toBe(0)
		await addUnlabelledFlows(home)
		const items = ofKind((await shown(home)).assumed, "unlabelled-income")
		expect(items.map((item) => item.path)).toEqual(["flows.bonus.label", "flows.gift.label"])
		expect(items[0]).toEqual({
			kind: "unlabelled-income",
			path: "flows.bonus.label",
			value: null,
			hint: 'Run "traj scenario apply base --set \'flows.bonus.label="income.section40_1"\'" for a salary, or name another label from "traj schema scenario apply".',
		})
	})

	it("lists the allowance classes taxAllowances.notStated leaves out, in that order", async () => {
		const home = await projectionHome()
		const res = await tax(home, ["base", "--tax", "th-2026", "--children", "1", ...SALARY])
		expect(res.code).toBe(0)
		const read = await shown(home)
		const notStated = read.taxAllowances?.notStated ?? []
		expect(notStated.length).toBeGreaterThan(0)
		const items = ofKind(read.assumed, "unstated-allowance")
		expect(items.map((item) => item.path)).toEqual(
			notStated.map((className) => `taxAllowances.${className}`),
		)
		expect(items.find((item) => item.path === "taxAllowances.retirementContributions")?.hint).toBe(
			'Add a contribution Flow with its label: run "traj scenario apply base --add flows=<json>"; "traj schema scenario apply" shows the shape.',
		)
		expect(items.find((item) => item.path === "taxAllowances.lifeInsurance")?.hint).toBe(
			'Run "traj scenario tax base --merge" with this allowance\'s flag to state it; "traj schema scenario tax" lists the flags.',
		)
	})

	it("lists the tax figures scenario tax --from-stored --dry-run names, in its order", async () => {
		const home = await projectionHome()
		const res = await tax(home, [
			"base",
			"--tax",
			"th-2026",
			"--mortgage-interest",
			"30000",
			...SALARY,
		])
		expect(res.code).toBe(0)
		const read = await shown(home)
		const dry = await tax(home, ["base", "--from-stored", "--dry-run"])
		expect(dry.code).toBe(0)
		const assumptions = (resultOf(dry) as { assumptions: TaxFigureEntry[] }).assumptions
		expect(assumptions.length).toBeGreaterThan(0)
		const figures = ofKind(read.assumed, "tax-figure").map(({ path, value, status, note }) => ({
			path,
			value,
			status,
			note,
		}))
		expect(figures.map((item) => item.path)).toEqual(assumptions.map((entry) => entry.path))
		expect(figures).toEqual(assumptions)
		expect(ofKind(read.assumed, "tax-figure").every((item) => item.hint === null)).toBe(true)
	})

	it("puts the kinds in the fixed order: unlabelled income, allowances, then tax figures", async () => {
		const home = await projectionHome()
		const res = await tax(home, [
			"base",
			"--tax",
			"th-2026",
			"--mortgage-interest",
			"30000",
			...SALARY,
		])
		expect(res.code).toBe(0)
		await addUnlabelledFlows(home)
		const kinds = (await shown(home)).assumed.map((item) => item.kind)
		const firstAllowance = kinds.indexOf("unstated-allowance")
		const firstFigure = kinds.indexOf("tax-figure")
		expect(kinds.slice(0, firstAllowance)).toEqual(["unlabelled-income", "unlabelled-income"])
		expect(firstAllowance).toBeGreaterThan(-1)
		expect(firstFigure).toBeGreaterThan(firstAllowance)
	})

	it("prints an empty list for an untaxed plan", async () => {
		const home = await projectionHome()
		const read = await shown(home)
		expect(read.taxed).toBe(false)
		expect(read.assumed).toEqual([])
	})

	it("lists no allowance item for a Levy whose profile is not stored", async () => {
		const home = await projectionHome()
		expect((await tax(home, ["base", "--tax", "th-2026", ...SALARY])).code).toBe(0)
		const document = (await shown(home)).document as {
			levies: { settlement: { month: number } }[]
		}
		const levies = document.levies.map((levy) => ({
			...levy,
			settlement: { ...levy.settlement, month: 5 },
		}))
		expect((await applyScenario(home, "base", { ...document, levies })).code).toBe(0)
		const read = await shown(home)
		expect(read.taxed).toBe(true)
		expect(read.tax).toBeNull()
		expect(ofKind(read.assumed, "unstated-allowance")).toEqual([])
	})
})
