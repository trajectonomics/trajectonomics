import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay, year2026 } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"

/* The interest on one loan borrowed together, stated once for both separate Returns (cli ADR-0075). */

const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const profileOf = async (home: string) =>
	resultOf(await scenario(home, ["show", "base"])).scenario.tax
const owes = async (home: string) => (await year2026(home)).map((it) => [it.filer, it.due])
const interest = (...values: string[]) => values.flatMap((it) => ["--mortgage-interest", it])

/** The home-loan interest each stored Levy claims, in satang. */
async function claimed(home: string): Promise<unknown[][]> {
	const { document } = resultOf(await scenario(home, ["show", "base"])).scenario
	const levies = document.levies as { id: string; measures: Record<string, unknown>[] }[]
	return levies.map((levy) => [
		levy.id,
		levy.measures.find((measure) => measure["id"] === "claim.mortgage_interest")?.["value"] ?? 0,
	])
}

/** A couple who file separately, with salaries of 1,000,000 and 500,000 baht. */
async function separate(...extra: string[]): Promise<string> {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, extra)
	expect(res.code, res.err).toBe(0)
	return home
}

describe("the shared interest", () => {
	it("splits half to each Return, and the odd satang goes to the holder", async () => {
		const home = await separate(...interest("shared=60000.01"))
		expect(await claimed(home)).toEqual([
			["th-2026-pit@me", 3_000_001],
			["th-2026-pit@partner", 3_000_000],
		])
		expect(await profileOf(home)).toMatchObject({ sharedMortgageInterest: 60000.01 })
		expect(await profileOf(home)).not.toHaveProperty("mortgageInterest")
	})

	/*
	 * me: 1,000,000 - 100,000 expenses - 60,000 personal - (30,000 + 50,000) = 760,000, so 65,000
	 * up to 750,000 and 20% of 10,000 = 67,000. partner: 500,000 - 100,000 - 60,000 - (30,000 +
	 * 40,000) = 270,000, so 5% of 120,000 = 6,000.
	 */
	it("is claimed with each Return's own interest, each under its ceiling", async () => {
		const home = await separate(...interest("shared=60000", "50000", "partner=40000"))
		expect(await claimed(home)).toEqual([
			["th-2026-pit@me", 8_000_000],
			["th-2026-pit@partner", 7_000_000],
		])
		expect(await owes(home)).toEqual([
			["me", "67000.00"],
			["partner", "6000.00"],
		])
		expect(await profileOf(home)).toMatchObject({
			sharedMortgageInterest: 60000,
			mortgageInterest: 50000,
			returns: { me: { mortgageInterest: 50000 }, partner: { mortgageInterest: 40000 } },
		})
	})

	/* me: 67,000 as above; partner: 500,000 - 100,000 - 60,000 - 30,000 = 310,000, so 7,500 + 1,000. */
	it("leaves the other Return the shared half alone: 67,000 and 8,500", async () => {
		const home = await separate(...interest("shared=60000", "50000"))
		expect(await owes(home)).toEqual([
			["me", "67000.00"],
			["partner", "8500.00"],
		])
	})

	/*
	 * me claims 50,000 + 80,000, which tax-core caps at 100,000 for one Return: 740,000, so 27,500
	 * up to 500,000 and 15% of 240,000 = 63,500. partner claims 50,000: 290,000, so 5% of 140,000.
	 */
	it("counts toward the one ceiling each Return has for all its interest", async () => {
		const home = await separate(...interest("shared=100000", "80000"))
		expect(await owes(home)).toEqual([
			["me", "63500.00"],
			["partner", "7000.00"],
		])
	})

	it("is stated by the write and by scenario show with no interest of a Return's own", async () => {
		const home = await separate(...interest("shared=60000"))
		const again = resultOf(await tax(home, "--from-stored"))
		expect(again.allowances.stated).toEqual(["mortgageInterest"])
		const shown = resultOf(await scenario(home, ["show", "base"])).scenario
		expect(shown.taxAllowances.stated).toEqual(["mortgageInterest"])
	})

	/* The one Filer: 1,000,000 - 100,000 - 60,000 - 60,000 = 780,000, so 65,000 + 6,000. */
	it("is claimed whole by the only person with income", async () => {
		const plan = { ...TWO_SALARIES, flows: [pay("salary", 100_000_000)] }
		const home = await couple(plan, coupleHousehold([{ path: "flows.salary", person: "me" }]))
		const label = ["--label", "salary=income.section40_1"]
		const res = await taxCouple(home, "married_separate", label, interest("shared=60000"))
		expect(res.code, res.err).toBe(0)
		expect(await owes(home)).toEqual([["me", "71000.00"]])
	})

	/* me: 790,000, so 65,000 + 8,000. partner: 290,000, so 7,000. */
	it("takes exactly 100,000, and refuses one satang more with tax-core's problem", async () => {
		const home = await separate(...interest("shared=100000"))
		expect(await owes(home)).toEqual([
			["me", "73000.00"],
			["partner", "7000.00"],
		])
		const res = await tax(home, "--merge", ...interest("shared=100000.01"))
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject({
			path: "--mortgage-interest",
			details: { problem: "MORTGAGE_OVER_CEILING", persons: ["me", "partner"] },
		})
		expect(await profileOf(home)).toMatchObject({ sharedMortgageInterest: 100000 })
	})
})

describe("a stored shared interest", () => {
	it("round-trips --from-stored and --merge, and a stated zero removes it", async () => {
		const home = await separate(...interest("shared=60000"))
		expect(resultOf(await tax(home, "--from-stored"))).toMatchObject({ status: "unchanged" })
		expect((await tax(home, "--merge", "--life-insurance", "1000")).code).toBe(0)
		expect(await profileOf(home)).toMatchObject({ sharedMortgageInterest: 60000 })
		expect((await tax(home, "--merge", ...interest("shared=40000"))).code).toBe(0)
		expect(await claimed(home)).toEqual([
			["th-2026-pit@me", 2_000_000],
			["th-2026-pit@partner", 2_000_000],
		])
		expect((await tax(home, "--merge", ...interest("shared=0"))).code).toBe(0)
		expect(await profileOf(home)).not.toHaveProperty("sharedMortgageInterest")
	})

	/*
	 * Joint, without the shared loan: 1,500,000 - 200,000 - 120,000 - 50,000 = 1,130,000, so
	 * 115,000 up to 1,000,000 and 25% of 130,000 = 147,500.
	 */
	it("is kept through a joint filing, which does not claim it, and comes back once", async () => {
		const home = await separate(...interest("shared=60000", "50000"))
		const before = [await profileOf(home), await owes(home)]
		const joined = await tax(home, "--merge", "--filing-status", "married_joint")
		expect(joined.code, joined.err).toBe(0)
		expect(await profileOf(home)).toMatchObject({
			sharedMortgageInterest: 60000,
			mortgageInterest: 50000,
		})
		expect((await year2026(home)).map((it) => it.due)).toEqual(["147500.00"])
		expect(resultOf(await tax(home, "--from-stored"))).toMatchObject({ status: "unchanged" })
		expect((await tax(home, "--merge", "--filing-status", "married_separate")).code).toBe(0)
		expect([await profileOf(home), await owes(home)]).toEqual(before)
	})

	it("is dropped by a write of the whole profile that leaves it out", async () => {
		const home = await separate(...interest("shared=60000"))
		expect((await taxCouple(home, "married_separate", LABELS)).code).toBe(0)
		expect(await profileOf(home)).not.toHaveProperty("sharedMortgageInterest")
	})
})

describe("shared= outside a separate filing", () => {
	const refused = {
		path: "--mortgage-interest",
		message: expect.stringContaining("married_separate"),
		hint: expect.stringContaining("File separately"),
	}

	it.each([
		"single",
		"married_joint",
		"married_no_income_spouse",
		"married_separate_40_1_joint_rest",
	])("is refused under %s", async (status) => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const res = await taxCouple(home, status, LABELS, interest("shared=1000"))
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject(refused)
	})

	it.each([
		["no household", null],
		["no Owners", coupleHousehold([])],
	])("is refused on a separate filing with %s", async (_when, household) => {
		const home = await couple(TWO_SALARIES, null)
		if (household !== null) expect((await setHousehold(home, household)).code).toBe(0)
		const res = await taxCouple(home, "married_separate", LABELS, interest("shared=1000"))
		expect(errorOf(res)).toMatchObject(refused)
	})

	it("is refused by --merge on a joint plan, or beside a switch to joint", async () => {
		const home = await separate()
		const joint = ["--filing-status", "married_joint"]
		const both = await tax(home, "--merge", ...joint, ...interest("shared=1000"))
		expect(errorOf(both)).toMatchObject(refused)
		expect((await tax(home, "--merge", ...joint)).code).toBe(0)
		const merged = await tax(home, "--merge", ...interest("shared=0"))
		expect(errorOf(merged)).toMatchObject(refused)
	})

	it("is refused when stated twice", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const twice = interest("shared=1000", "shared=2000")
		const res = await taxCouple(home, "married_separate", LABELS, twice)
		expect(errorOf(res).message).toContain('states "shared" twice')
	})
})
