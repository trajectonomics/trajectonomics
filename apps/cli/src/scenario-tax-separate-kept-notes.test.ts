import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay, year2026 } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"
import type { Captured } from "./test-support"

/* What a write says of the claims a profile keeps that its Return does not claim (cli ADR-0075). */

const PATH = "allowances.mortgageInterestCeiling"
const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const refile = (home: string, status: string) => tax(home, "--merge", "--filing-status", status)

/** The write's assumption about the home-loan ceiling, listed at most once. */
function ceiling(res: Captured): { value: number; status: string; note: string } | undefined {
	expect(res.code, res.err).toBe(0)
	const found = resultOf(res).assumptions as { path: string }[]
	const [entry, ...more] = found.filter((it) => it.path === PATH)
	expect(more).toEqual([])
	return entry as ReturnType<typeof ceiling>
}

/** A couple who file separately, with salaries of 1,000,000 and 500,000 baht. */
async function separate(...extra: string[]): Promise<string> {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, extra)
	expect(res.code, res.err).toBe(0)
	return home
}

describe("shared interest a Return does not claim", () => {
	const SHARED = ["--mortgage-interest", "shared=60000"]
	const SAID = "60,000 baht of shared home-loan interest is stored for separate Returns"

	/*
	 * Joint with the interest stated: 1,500,000 - 200,000 expenses - 120,000 personal - 100,000,
	 * the Return's ceiling on 110,000 = 1,080,000, so 115,000 and 25% of 80,000 = 135,000.
	 */
	it("is named on a joint Return, with the flag that states this Return's interest", async () => {
		const home = await separate(...SHARED, "--mortgage-interest", "50000")
		const joined = ceiling(await refile(home, "married_joint"))
		expect(joined).toMatchObject({ value: 100000, status: "reported" })
		expect(joined?.note).toContain(`${SAID}, and this Return does not claim it.`)
		expect(joined?.note).toContain("--mortgage-interest <amount> --merge")
		expect(ceiling(await tax(home, "--from-stored"))?.note).toContain(SAID)
		const stated = await tax(home, "--merge", "--mortgage-interest", "110000")
		expect(ceiling(stated)?.note).toContain(SAID)
		expect((await year2026(home)).map((it) => it.due)).toEqual(["135000.00"])
	})

	it.each(["married_joint", "single"])(
		"is named under %s even when the Return claims no interest",
		async (status) => {
			const home = await separate(...SHARED)
			const res = await refile(home, status)
			expect(ceiling(res)).toMatchObject({ value: 100000, status: "reported" })
			expect(ceiling(res)?.note).toContain(SAID)
			expect(resultOf(res).allowances.stated).toEqual([])
			const back = ceiling(await refile(home, "married_separate"))
			expect(back?.note).not.toContain("does not claim")
		},
	)
})

describe("a partner's claims a Return does not claim", () => {
	const SAID = 'The claims stored for "partner" are kept for a separate filing'

	it.each(["married_joint", "single"])("are named under %s", async (status) => {
		const home = await separate("--parents", "partner=2")
		const res = await refile(home, status)
		expect(ceiling(res)?.note).toContain(`${SAID}, and this Return does not claim them.`)
		expect(ceiling(res)?.note).not.toContain("shared home-loan interest is stored")
		const back = await refile(home, "married_separate")
		expect(ceiling(back)).toBeUndefined()
	})

	it("says nothing when the partner claims nothing", async () => {
		const home = await separate("--parents", "1")
		expect(ceiling(await refile(home, "married_joint"))).toBeUndefined()
	})
})

describe("the shared ceiling of a sole Filer", () => {
	it("is refused without speaking of both Returns", async () => {
		const plan = { ...TWO_SALARIES, flows: [pay("salary", 100_000_000)] }
		const home = await couple(plan, coupleHousehold([{ path: "flows.salary", person: "me" }]))
		const label = ["--label", "salary=income.section40_1"]
		const over = ["--mortgage-interest", "shared=100001"]
		const res = await taxCouple(home, "married_separate", label, over)
		expect(errorOf(res)).toMatchObject({ details: { persons: ["me"] } })
		expect(errorOf(res).message).toContain("a loan borrowed together has (MORTGAGE_OVER_CEILING)")
	})
})
