import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	labelSavings,
	SAVINGS,
	TWO_SALARIES,
	taxCouple,
} from "./scenario-tax-filers-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"

/** Flows and Accounts of the stored `base`, by id, with the labels they carry. */
async function labelsOf(home: string): Promise<Record<string, unknown>> {
	const shown = resultOf(await scenario(home, ["show", "base"])).scenario.document as {
		flows: { id: string; label?: string }[]
		accounts: { id: string; returnLabel?: string }[]
	}
	return {
		...Object.fromEntries(shown.flows.map((flow) => [flow.id, flow.label])),
		...Object.fromEntries(shown.accounts.map((account) => [account.id, account.returnLabel])),
	}
}

describe("scenario tax, a joint Return with Owners (cli ADR-0075)", () => {
	it("writes one Levy and gives each Flow its Owner's Filer label", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		const res = await taxCouple(home, "married_joint")
		expect(res.code).toBe(0)
		expect(resultOf(res)).toMatchObject({ levy: "th-2026-pit", filers: ["me", "partner"] })
		const shown = resultOf(await scenario(home, ["show", "base"])).scenario.document
		expect(shown.levies.map((levy: { id: string }) => levy.id)).toEqual(["th-2026-pit"])
		expect(await labelsOf(home)).toMatchObject({
			salary: "income.section40_1@me",
			"partner-salary": "income.section40_1@partner",
			pvd: "allowance.retirement.pvd@partner",
		})
	})

	it("labels an Account's interest from its Owner, shared for both", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		await taxCouple(home, "married_joint")
		expect((await labelSavings(home)).code).toBe(0)
		expect(await labelsOf(home)).toMatchObject({ [SAVINGS]: "income.section40_4.interest@shared" })
	})

	it("names only the people who have income as Filers, and shared income is both's", async () => {
		const alone = await couple(
			COUPLE_PLAN,
			coupleHousehold([
				{ path: "flows.salary", person: "me" },
				{ path: "flows.partner-salary", person: "me" },
				{ path: "flows.pvd", person: "me" },
			]),
		)
		expect(resultOf(await taxCouple(alone, "married_joint")).filers).toEqual(["me"])
		const shared = await couple(
			TWO_SALARIES,
			coupleHousehold([
				{ path: "flows.salary", person: "shared" },
				{ path: "flows.partner-salary", person: "shared" },
			]),
		)
		const labels = [
			"--label",
			"salary=income.section40_1",
			"--label",
			"partner-salary=income.section40_1",
		]
		expect(resultOf(await taxCouple(shared, "married_joint", labels)).filers).toEqual([
			"me",
			"partner",
		])
	})

	it("writes the same document again, and --from-stored keeps its Filers", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		await taxCouple(home, "married_joint")
		expect(resultOf(await taxCouple(home, "married_joint")).status).toBe("unchanged")
		const again = resultOf(await scenario(home, ["tax", "base", "--from-stored"]))
		expect(again).toMatchObject({ status: "unchanged", filers: ["me", "partner"] })
	})

	it("takes the Filer suffix off again when the status stops being joint, or the tax is removed", async () => {
		const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		await taxCouple(home, "married_joint")
		await labelSavings(home)
		const single = await scenario(home, ["tax", "base", "--merge", "--filing-status", "single"])
		expect(resultOf(single)).not.toHaveProperty("filers")
		expect(await labelsOf(home)).toMatchObject({
			salary: "income.section40_1",
			[SAVINGS]: "income.section40_4.interest",
		})
		const unlabelled = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
		await taxCouple(unlabelled, "married_joint")
		expect((await scenario(unlabelled, ["tax", "base", "--none"])).code).toBe(0)
		const bare = await labelsOf(unlabelled)
		expect(bare["salary"]).toBeUndefined()
		expect(bare["partner-salary"]).toBeUndefined()
		expect(bare["pvd"]).toBeUndefined()
	})
})

describe("scenario tax, the refusals of a joint Return", () => {
	it("refuses a taxed Flow with no Owner, listing each", async () => {
		const home = await couple(
			COUPLE_PLAN,
			coupleHousehold([{ path: "flows.salary", person: "me" }]),
		)
		const res = await taxCouple(home, "married_joint")
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			exitCode: 2,
			path: "document",
			details: { items: ["flows.partner-salary", "flows.pvd"] },
		})
	})

	it("refuses a person whose id cannot be a Filer id, naming the household field", async () => {
		const household = coupleHousehold()
		household.people[0] = { ...household.people[0]!, id: "Me Too" }
		household.owners = [
			{ path: "flows.salary", person: "Me Too" },
			{ path: "flows.partner-salary", person: "partner" },
		]
		const home = await couple(TWO_SALARIES, household)
		const labels = [
			"--label",
			"salary=income.section40_1",
			"--label",
			"partner-salary=income.section40_1",
		]
		const res = await taxCouple(home, "married_joint", labels)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({
			code: "invalid_input",
			path: "--filing-status",
			details: { field: "people.0.id", person: "Me Too" },
		})
		expect(errorOf(res).hint).toContain("scenario household")
	})
})

describe("the tax a joint Return owes, by hand", () => {
	/*
	 * Salaries of 1,000,000 and 500,000 baht, filed jointly (s.57 sexies para 3), two Owners.
	 *   assessable income       1,000,000 + 500,000                      = 1,500,000
	 *   expenses, s.42 bis      each spouse 50%, capped at 100,000 -> 100,000 + 100,000 = 200,000
	 *   allowances              60,000 personal + 60,000 spouse         = 120,000
	 *   taxable income          1,500,000 - 200,000 - 120,000            = 1,180,000
	 *   brackets                150,000 at 0%                            =       0
	 *                           150,000 at 5%                            =   7,500
	 *                           200,000 at 10%                           =  20,000
	 *                           250,000 at 15%                           =  37,500
	 *                           250,000 at 20%                           =  50,000
	 *                           180,000 at 25%                           =  45,000
	 *                                                              tax    = 160,000
	 * The old joint Levy tallied both salaries under one label, so it capped the couple at
	 * 100,000 of expenses: taxable 1,280,000 and tax 160,000 + 25,000 = 185,000.
	 */
	const YEAR = ["--scenario", "base", "--as-of", "2026-01-01", "--horizon", "2027-12-31"]
	const LABELS = [
		"--label",
		"salary=income.section40_1",
		"--label",
		"partner-salary=income.section40_1",
	]

	async function year2026(home: string) {
		const run = runBody(await projection(home, ["run", ...YEAR]))
		const found = run.taxYears.find((it) => it.from === "2026-01-01")
		if (found === undefined) throw new Error("no 2026 tax year")
		return found
	}

	it("gives each spouse their own expense ceiling: 160,000 where one Levy gave 185,000", async () => {
		const joint = await couple(TWO_SALARIES, coupleHousehold())
		expect((await taxCouple(joint, "married_joint", LABELS)).code).toBe(0)
		expect(await year2026(joint)).toMatchObject({
			due: "160000.00",
			taxableIncome: "1180000.00",
			walk: {
				assessable: "1500000.00",
				expenses: "200000.00",
				allowances: "120000.00",
				taxableIncome: "1180000.00",
			},
		})
		const bare = await couple(TWO_SALARIES, null)
		expect((await taxCouple(bare, "married_joint", LABELS)).code).toBe(0)
		expect(await year2026(bare)).toMatchObject({ due: "185000.00", taxableIncome: "1280000.00" })
	})
})
