// `scenario show` states which deduction classes a taxed plan states, from the function `scenario tax`
// reports them with (cli ADR-0073).
import { describe, expect, it } from "bun:test"
import { projectionHome } from "./projection/testing"
import { SALARY, shown, tax } from "./scenario-tax-profile-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"
import { capture } from "./test-support"

type Allowances = { stated: string[]; notStated: string[] }

/** What `scenario show` states for the plan `base`. */
async function shownAllowances(home: string): Promise<Allowances | undefined> {
	return ((await shown(home)) as unknown as { taxAllowances?: Allowances }).taxAllowances
}

/** What `scenario tax --from-stored --dry-run` reports for the plan `base`. */
async function dryRunAllowances(home: string): Promise<Allowances> {
	const res = await tax(home, ["base", "--from-stored", "--dry-run"])
	expect(res.code).toBe(0)
	return (resultOf(res) as { allowances: Allowances }).allowances
}

/** The plan `base` with a second contribution Flow, so one plan can carry an RMF and a ThaiESG label. */
async function withSecondContribution(home: string): Promise<void> {
	const document = (await shown(home)).document as { flows: Record<string, unknown>[] }
	const invest = document.flows.find((flow) => flow["id"] === "invest")
	const flows = [...document.flows, { ...invest, id: "esg" }]
	expect((await applyScenario(home, "base", { ...document, flows })).code).toBe(0)
}

const CASES: readonly { name: string; argv: readonly string[]; second?: boolean }[] = [
	{ name: "a bare profile", argv: [] },
	{ name: "children", argv: ["--children", "2", "--children-at-higher-rate", "1"] },
	{ name: "parents and disabled care", argv: ["--parents", "2", "--disabled-care", "1"] },
	{
		name: "insurance",
		argv: [
			"--life-insurance",
			"20000",
			"--health-insurance",
			"5000",
			"--spouse-life-insurance",
			"1",
		],
	},
	{ name: "an RMF contribution Flow", argv: ["--label", "invest=allowance.retirement.rmf"] },
	{ name: "a ThaiESG contribution Flow", argv: ["--label", "invest=allowance.thai_esg"] },
	{
		name: "an RMF and a ThaiESG contribution Flow, with a child and a policy",
		argv: [
			"--children",
			"1",
			"--life-insurance",
			"20000",
			"--label",
			"invest=allowance.retirement.rmf",
			"--label",
			"esg=allowance.thai_esg",
		],
		second: true,
	},
]

describe("scenario show states the tax allowances of a taxed plan", () => {
	for (const { name, argv, second } of CASES) {
		it(`names the classes scenario tax --from-stored --dry-run names, for ${name}`, async () => {
			const home = await projectionHome()
			if (second === true) await withSecondContribution(home)
			const res = await tax(home, ["base", "--tax", "th-2026", ...SALARY, ...argv])
			expect(res.code).toBe(0)
			const read = await shownAllowances(home)
			expect(read).toEqual(await dryRunAllowances(home))
		})
	}

	it("states a flag class and a contribution class by name", async () => {
		const home = await projectionHome()
		await tax(home, [
			"base",
			"--tax",
			"th-2026",
			"--children",
			"1",
			"--label",
			"invest=allowance.thai_esg",
			...SALARY,
		])
		const read = await shownAllowances(home)
		expect(read?.stated).toEqual(["children", "thaiEsg"])
		expect(read?.notStated).toContain("retirementContributions")
		expect(read?.notStated).not.toContain("thaiEsg")
	})

	it("follows a merge", async () => {
		const home = await projectionHome()
		await tax(home, ["base", "--tax", "th-2026", ...SALARY])
		expect((await shownAllowances(home))?.notStated).toContain("children")
		expect((await tax(home, ["base", "--merge", "--children", "1"])).code).toBe(0)
		expect((await shownAllowances(home))?.stated).toContain("children")
	})

	it("leaves the field out of an untaxed plan, whose output keeps its keys", async () => {
		const home = await projectionHome()
		const plan = await shown(home)
		expect(plan.taxed).toBe(false)
		expect("taxAllowances" in plan).toBe(false)
	})

	it("leaves the field out of a plan whose Levy no profile states, and again after --none", async () => {
		const home = await projectionHome()
		await tax(home, ["base", "--tax", "th-2026", ...SALARY])
		const document = (await shown(home)).document as { levies: { settlement: { month: number } }[] }
		const levies = document.levies.map((levy) => ({
			...levy,
			settlement: { ...levy.settlement, month: 5 },
		}))
		expect((await applyScenario(home, "base", { ...document, levies })).code).toBe(0)
		const edited = await shown(home)
		expect(edited.taxed).toBe(true)
		expect(edited.tax).toBeNull()
		expect("taxAllowances" in edited).toBe(false)
		expect((await tax(home, ["base", "--none"])).code).toBe(0)
		expect("taxAllowances" in (await shown(home))).toBe(false)
	})

	it("prints the field in the human format", async () => {
		const home = await projectionHome()
		await tax(home, ["base", "--tax", "th-2026", "--children", "1", ...SALARY])
		const res = await capture(["scenario", "show", "base"], { TRAJ_HOME: home })
		expect(res.code).toBe(0)
		expect(res.out).toContain("taxAllowances")
		expect(res.out).toContain("notStated")
		expect(res.out).toContain("children")
	})

	it("is the same under --decimal", async () => {
		const home = await projectionHome()
		await tax(home, ["base", "--tax", "th-2026", "--children", "1", ...SALARY])
		const plain = await scenario(home, ["show", "base"])
		const decimal = await scenario(home, ["show", "base", "--decimal"])
		expect(resultOf(decimal).scenario.taxAllowances).toEqual(resultOf(plain).scenario.taxAllowances)
	})
})
