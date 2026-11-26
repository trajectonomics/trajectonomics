import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
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

/** The 2026 tax each Return owes, by Filer. */
async function filed(home: string): Promise<[string | undefined, string][]> {
	return (await year2026(home)).map((it) => [it.filer, it.due])
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
const KEPT =
	'The claims stored for "partner" are kept for a separate filing, and this Return does not claim them.'

/** The hint, with the holder named and an example flag for a claim the kept set holds. */
function hint(example: string): string {
	return ` If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as the holder's own, so state "me"'s own claims again when switching back, for example ${example} --merge.`
}

const HINT = hint("--parents me=<n>")
const CLAIMS = KEPT + HINT

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
	it.each([
		["married_joint", CLAIMS],
		["married_no_income_spouse", CLAIMS],
		["single", KEPT],
	])("are unclaimed under %s, with how to claim only where safe", async (status, sentence) => {
		const home = await separate("--parents", "partner=2")
		const res = await refile(home, status)
		expect(unclaimed(res)).toEqual([sentence])
		expect(ceiling(res)).toBeUndefined()
		expect(unclaimed(await refile(home, "married_separate"))).toBeUndefined()
	})

	it("say no hint on a married_separate write with no Filers", async () => {
		const home = await separate("--parents", "partner=2")
		const set = await setHousehold(home, coupleHousehold([]))
		expect(set.code, set.err).toBe(0)
		expect(unclaimed(await refile(home, "married_separate"))).toEqual([KEPT])
	})

	/*
	 * me: 1,000,000 - 100,000 - 60,000 = 840,000, so 83,000. partner: 500,000 - 100,000 - 60,000 -
	 * 60,000, two parents at 30,000 each = 280,000, so 6,500. A joint Return counts only the flat
	 * claims, 160,000; stating them bare gives 1,500,000 - 200,000 - 180,000 = 1,120,000, so 145,000.
	 * A later separate filing then reads those bare claims as the holder's: 71,000 and 6,500.
	 * Following the caveat's flag with the holder's own value restores 83,000 and 6,500.
	 */
	it("warns that bare claims become the holder's on a later separate filing", async () => {
		const home = await separate("--parents", "partner=2")
		expect(await filed(home)).toEqual([
			["me", "83000.00"],
			["partner", "6500.00"],
		])
		expect(unclaimed(await refile(home, "married_joint"))).toEqual([CLAIMS])
		expect((await year2026(home)).map((it) => it.due)).toEqual(["160000.00"])
		// The hint has been followed, and is still printed: its first clause is conditional.
		expect(unclaimed(await tax(home, "--merge", "--parents", "2"))).toEqual([CLAIMS])
		expect((await year2026(home)).map((it) => it.due)).toEqual(["145000.00"])
		expect((await refile(home, "married_separate")).code).toBe(0)
		expect(await filed(home)).toEqual([
			["me", "71000.00"],
			["partner", "6500.00"],
		])
		expect((await tax(home, "--merge", "--parents", "me=0")).code).toBe(0)
		expect(await filed(home)).toEqual([
			["me", "83000.00"],
			["partner", "6500.00"],
		])
	})

	it("takes the example flag from a claim the kept set holds", async () => {
		const home = await separate("--life-insurance", "partner=80000")
		const res = await refile(home, "married_joint")
		expect(unclaimed(res)).toEqual([KEPT + hint("--life-insurance me=<amount>")])
	})

	it("keeps the older words when the plan names no holder", async () => {
		const home = await separate("--parents", "partner=2")
		const gone = await scenario(home, ["household", "base", "--none"])
		expect(gone.code, gone.err).toBe(0)
		const res = await refile(home, "married_joint")
		expect(unclaimed(res)).toEqual([
			`${KEPT} If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as the holder's own, so state the holder's own claims again when switching back.`,
		])
	})

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
		const block = `Claims stored but not claimed by this write:\n- ${CLAIMS}`
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
