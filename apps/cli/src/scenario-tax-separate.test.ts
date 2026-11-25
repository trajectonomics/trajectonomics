import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	TWO_SALARIES,
	taxCouple,
} from "./scenario-tax-filers-support"
import { applyScenario, errorOf, resultOf, scenario } from "./scenario-test-support"

/* The separate Return (cli ADR-0075): one Levy per Filer, each Flow labelled for its Owner. */

const LABELS = [
	"--label",
	"salary=income.section40_1",
	"--label",
	"partner-salary=income.section40_1",
]

/** One income Flow of a year's pay, optionally prepaid at a share of basis points. */
function pay(id: string, satang: number, bps?: number): Record<string, unknown> {
	return {
		id,
		kind: "income",
		earned: true,
		amount: satang,
		frequency: "annual",
		start: "2026-01-01",
		end: "2026-12-31",
		growth: { bps: 0 },
		...(bps === undefined ? {} : { prepayments: [{ levy: "th-2026-pit", bps }] }),
	}
}

/** The three salaries of the prepayment case: two owned, one shared. */
const BARE_PLAN = {
	...TWO_SALARIES,
	flows: [pay("salary", 100_000_000), pay("partner-salary", 50_000_000), pay("bonus", 10_000_000)],
}

/** The same plan with each Flow's Prepayment naming the joint Levy, and the joint labels kept. */
const PREPAID_PLAN = {
	...TWO_SALARIES,
	flows: [
		{ ...pay("salary", 100_000_000, 500), label: "income.section40_1@me" },
		{ ...pay("partner-salary", 50_000_000, 300), label: "income.section40_1@partner" },
		{ ...pay("bonus", 10_000_000, 101), label: "income.section40_1@shared" },
	],
}

/** The holder's and the partner's salaries, and a bonus the two share. */
const PREPAID_OWNERS = [
	{ path: "flows.salary", person: "me" },
	{ path: "flows.partner-salary", person: "partner" },
	{ path: "flows.bonus", person: "shared" },
]

/** The stored document of `base`. */
async function documentOf(home: string): Promise<Record<string, unknown>> {
	const shown = resultOf(await scenario(home, ["show", "base"])).scenario
	return shown.document as Record<string, unknown>
}

/** A flow of the stored document, by id. */
function flowOf(document: Record<string, unknown>, id: string): Record<string, unknown> {
	return (document["flows"] as Record<string, unknown>[]).find((flow) => flow["id"] === id)!
}

describe("scenario tax, a separate Return", () => {
	it("writes one Levy per Filer and gives each Flow its Owner's Filer label", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const res = await taxCouple(home, "married_separate")
		expect(res.code, res.err).toBe(0)
		expect(resultOf(res)).toMatchObject({
			filers: ["me", "partner"],
			levies: ["th-2026-pit@me", "th-2026-pit@partner"],
		})
		const document = await documentOf(home)
		expect((document["levies"] as { id: string }[]).map((levy) => levy.id)).toEqual([
			"th-2026-pit@me",
			"th-2026-pit@partner",
		])
		expect(flowOf(document, "salary")["label"]).toBe("income.section40_1@me")
		expect(flowOf(document, "partner-salary")["label"]).toBe("income.section40_1@partner")
		expect(flowOf(document, "pvd")["label"]).toBe("allowance.retirement.pvd@partner")
	})

	it("re-points each Prepayment to its Owner's Levy, and halves a shared one, odd basis point to the holder", async () => {
		const home = await couple(BARE_PLAN, coupleHousehold(PREPAID_OWNERS))
		const labels = [...LABELS, "--label", "bonus=income.section40_1"]
		expect((await taxCouple(home, "married_joint", labels)).code).toBe(0)
		const before = await documentOf(home)
		const applied = await applyScenario(home, "base", { ...before, flows: PREPAID_PLAN.flows })
		expect(applied.code, applied.err).toBe(0)
		const split = await scenario(home, [
			"tax",
			"base",
			"--merge",
			"--filing-status",
			"married_separate",
		])
		expect(split.code, split.err).toBe(0)
		const document = await documentOf(home)
		expect(flowOf(document, "salary")["prepayments"]).toEqual([
			{ levy: "th-2026-pit@me", bps: 500 },
		])
		expect(flowOf(document, "partner-salary")["prepayments"]).toEqual([
			{ levy: "th-2026-pit@partner", bps: 300 },
		])
		expect(flowOf(document, "bonus")["prepayments"]).toEqual([
			{ levy: "th-2026-pit@me", bps: 51 },
			{ levy: "th-2026-pit@partner", bps: 50 },
		])
	})

	it("gives each Return its children and deductions, and --merge and --from-stored keep them", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const extra = ["--children", "1", "--parents", "partner=2"]
		expect((await taxCouple(home, "married_separate", LABELS, extra)).code).toBe(0)
		const stored = resultOf(await scenario(home, ["show", "base"])).scenario.tax
		expect(stored).toMatchObject({
			filingStatus: "married_separate",
			children: 1,
			returns: {
				me: { children: 1, childrenAtHigherRate: 0 },
				partner: { children: 0, childrenAtHigherRate: 0, parents: 2 },
			},
		})
		expect((await scenario(home, ["tax", "base", "--merge", "--children", "partner=1"])).code).toBe(
			0,
		)
		expect(resultOf(await scenario(home, ["show", "base"])).scenario.tax).toMatchObject({
			returns: { me: { children: 1 }, partner: { children: 1, parents: 2 } },
		})
		const again = await scenario(home, ["tax", "base", "--from-stored"])
		expect(again.code, again.err).toBe(0)
		expect(resultOf(again)).toMatchObject({ status: "unchanged" })
	})

	it("refuses a person-qualified value without a separate Return, naming the flag", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const res = await taxCouple(home, "single", LABELS, ["--parents", "partner=2"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
	})

	it("refuses it too when the household has a partner but no Owners", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold([]))
		const res = await taxCouple(home, "married_separate", LABELS, ["--parents", "partner=2"])
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
	})
})

describe("the tax a separate Return owes, by hand", () => {
	/*
	 * Salaries of 1,000,000 and 500,000, filed separately (s.57 sexies para 1). Each Return has its
	 * own 100,000 expense ceiling and its own 60,000 personal allowance; neither claims a spouse.
	 *   me       1,000,000 - 100,000 - 60,000 = 840,000
	 *            0 + 7,500 + 20,000 + 37,500 + 10% of 90,000 = 83,000
	 *   partner    500,000 - 100,000 - 60,000 = 340,000
	 *            0 + 7,500 + 10% of 40,000 = 11,500
	 */
	async function year2026(home: string) {
		const run = runBody(
			await projection(home, [
				"run",
				"--scenario",
				"base",
				"--as-of",
				"2026-01-01",
				"--horizon",
				"2027-12-31",
			]),
		)
		return run.taxYears.filter((it) => it.from === "2026-01-01")
	}

	it("states each Return's own tax year, with its levy and filer", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		expect((await taxCouple(home, "married_separate", LABELS)).code).toBe(0)
		const years = await year2026(home)
		expect(years.map((it) => [it.filer, it.due])).toEqual([
			["me", "83000.00"],
			["partner", "11500.00"],
		])
		expect(years.map((it) => it.levy)).toEqual(["th-2026-pit@me", "th-2026-pit@partner"])
	})

	it("keeps a plan without Filers as it was, with no filer on its tax year", async () => {
		const home = await couple(TWO_SALARIES, null)
		expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
		const [year] = await year2026(home)
		expect(year).toBeDefined()
		expect(year).not.toHaveProperty("filer")
		expect(year?.levy).toBe("th-2026-pit")
	})
})
