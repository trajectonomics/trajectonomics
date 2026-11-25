import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay, year2026 } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"
import { type Captured, capture } from "./test-support"

/* What a write says of the claims a profile keeps that its Return does not claim (cli ADR-0075). */

const PATH = "allowances.mortgageInterestCeiling"
const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const refile = (home: string, status: string) => tax(home, "--merge", "--filing-status", status)

/** The sentences of a write that must succeed; undefined when it states no `unclaimed`. */
function unclaimed(res: Captured): string[] | undefined {
	expect(res.code, res.err).toBe(0)
	return resultOf(res).unclaimed
}

/** The write's assumption about the home-loan ceiling, listed at most once. */
function ceiling(res: Captured): { note: string } | undefined {
	expect(res.code, res.err).toBe(0)
	const found = resultOf(res).assumptions as { path: string; note: string }[]
	const [entry, ...more] = found.filter((it) => it.path === PATH)
	expect(more).toEqual([])
	return entry
}

/** A couple who file separately, with salaries of 1,000,000 and 500,000 baht. */
async function separate(...extra: string[]): Promise<string> {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, extra)
	expect(unclaimed(res)).toBeUndefined()
	return home
}

const SHARED = ["--mortgage-interest", "shared=60000"]
const INTEREST =
	"60,000 baht of shared home-loan interest is stored for separate Returns, and this Return does not claim it. To state this Return's interest, use --mortgage-interest <amount> --merge; it replaces the stored mortgageInterest, which a later separate filing reads as one person's own, so state that again then."
const CLAIMS =
	'The claims stored for "partner" are kept for a separate filing, and this Return does not claim them. To claim them on this Return, state them bare with --merge.'

describe("shared interest a Return does not claim", () => {
	/*
	 * Joint with the interest stated: 1,500,000 - 200,000 expenses - 120,000 personal - 100,000,
	 * the Return's ceiling on 110,000 = 1,080,000, so 115,000 and 25% of 80,000 = 135,000.
	 */
	it("is unclaimed on a joint Return, and no assumption says so", async () => {
		const home = await separate(...SHARED, "--mortgage-interest", "50000")
		const joined = await refile(home, "married_joint")
		expect(unclaimed(joined)).toEqual([INTEREST])
		expect(ceiling(joined)?.note).not.toContain("does not claim")
		expect(unclaimed(await tax(home, "--from-stored"))).toEqual([INTEREST])
		const stated = await tax(home, "--merge", "--mortgage-interest", "110000")
		expect(unclaimed(stated)).toEqual([INTEREST])
		expect((await year2026(home)).map((it) => it.due)).toEqual(["135000.00"])
	})

	it.each(["married_joint", "single"])(
		"lists no ceiling under %s when the Return claims no interest",
		async (status) => {
			const home = await separate(...SHARED)
			const res = await refile(home, status)
			expect(unclaimed(res)).toEqual([INTEREST])
			expect(ceiling(res)).toBeUndefined()
			expect(resultOf(res).allowances.stated).toEqual([])
			expect(unclaimed(await refile(home, "married_separate"))).toBeUndefined()
		},
	)
})

describe("a partner's claims a Return does not claim", () => {
	it.each(["married_joint", "single"])(
		"are unclaimed under %s, with how to claim",
		async (status) => {
			const home = await separate("--parents", "partner=2")
			const res = await refile(home, status)
			expect(unclaimed(res)).toEqual([CLAIMS])
			expect(ceiling(res)).toBeUndefined()
			expect(unclaimed(await refile(home, "married_separate"))).toBeUndefined()
		},
	)

	it("follow the shared interest when both are kept", async () => {
		const home = await separate(...SHARED, "--parents", "partner=2")
		expect(unclaimed(await refile(home, "married_joint"))).toEqual([INTEREST, CLAIMS])
	})

	it("are not named when the partner claims nothing", async () => {
		const home = await separate("--parents", "1")
		expect(unclaimed(await refile(home, "married_joint"))).toBeUndefined()
	})

	it("print under their own heading, not under the assumptions", async () => {
		// The holder's interest gives the Return an unconfirmed figure, so both blocks print.
		const home = await separate("--parents", "partner=2", "--mortgage-interest", "50000")
		await refile(home, "married_joint")
		const argv = ["scenario", "tax", "base", "--from-stored"]
		const printed = await capture(argv, { TRAJ_HOME: home })
		expect(printed.code, printed.err).toBe(0)
		const block = `Claims stored but not claimed on this Return:\n- ${CLAIMS}`
		expect(printed.out).toContain(block)
		expect(printed.out.split(CLAIMS)).toHaveLength(2)
		expect(printed.out).not.toContain("unclaimed:")
		expect(printed.out.indexOf(block)).toBeLessThan(printed.out.indexOf("Assumptions ("))
		await refile(home, "married_separate")
		const back = await capture(argv, { TRAJ_HOME: home })
		expect(back.out).not.toContain("not claimed on this Return")
	})

	it("are described by traj schema", async () => {
		const res = await capture(["schema", "scenario", "tax", "--json"])
		expect(res.out).toContain('"unclaimed":{')
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
