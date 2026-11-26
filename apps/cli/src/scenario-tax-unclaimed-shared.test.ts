import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay, year2026 } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"
import type { Captured } from "./test-support"

/* What a write says of shared home-loan interest no Return of it claims (cli ADR-0075). */

const PATH = "allowances.mortgageInterestCeiling"
const SHARED = ["--mortgage-interest", "shared=60000"]
const INTEREST =
	"60,000 baht of shared home-loan interest is stored for separate Returns, and this Return does not claim it. To state this Return's interest, use --mortgage-interest <amount> --merge; it replaces the stored mortgageInterest, which a later separate filing reads as one person's own, so state that again then."
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

	/*
	 * me's own 10,000 and the shared 60,000 make 70,000. The shared sentence's bare 70,000 drops
	 * me's own interest, so the caveat's command states me's 10,000 again: 75,000 and 5,000.
	 */
	it("follow the shared interest when both are kept", async () => {
		const home = await separate(
			...SHARED,
			"--parents",
			"partner=2",
			"--mortgage-interest",
			"me=10000",
		)
		expect((await year2026(home)).map((it) => it.due)).toEqual(["75000.00", "5000.00"])
		const [shared, sentence] = unclaimed(await refile(home, "married_joint")) as [string, string]
		expect(shared).toBe(INTEREST)
		expect(sentence).toContain(
			"for example --filing-status married_separate --parents me=<n> --mortgage-interest me=<amount> --merge.",
		)
		// Follow both sentences: the shared interest bare, then the caveat's whole command.
		expect(
			(await tax(home, "--merge", "--parents", "2", "--mortgage-interest", "70000")).code,
		).toBe(0)
		expect((await year2026(home)).map((it) => it.due)).toEqual(["127500.00"])
		const command = /for example (--filing-status married_separate .+) --merge\.$/.exec(
			sentence,
		)![1]!
		const filled = command.replace(
			/--([a-z-]+) me=<(?:n|amount)>/g,
			(_all, flag: string) => `--${flag} me=${flag === "parents" ? "0" : "10000"}`,
		)
		expect(filled).not.toContain("<")
		const back = await tax(home, ...filled.split(" "), "--merge")
		expect(back.code, back.err).toBe(0)
		expect((await year2026(home)).map((it) => it.due)).toEqual(["75000.00", "5000.00"])
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
