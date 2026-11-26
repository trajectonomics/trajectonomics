import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { documentOf, LABELS, year2026 } from "./scenario-tax-separate-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"
import { type Captured, capture } from "./test-support"

/* What a write says of the claims a profile keeps that its Return does not claim (cli ADR-0075). */

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

/** A couple who file separately, with salaries of 1,000,000 and 500,000 baht. */
async function separate(...extra: string[]): Promise<string> {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	const res = await taxCouple(home, "married_separate", LABELS, extra)
	expect(unclaimed(res)).toBeUndefined()
	return home
}

const KEPT =
	'The claims stored for "partner" are kept for a separate filing, and this Return does not claim them.'

/** The hint, with the flat claims' person named and the full switch-back command as its example. */
function hint(example: string): string {
	return ` If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as "me"'s own, so note "me"'s own claims from scenario show before you state them bare, and state them again when switching back, for example --filing-status married_separate ${example} --merge.`
}

const OLDER =
	" If this Return does not claim them yet, state them bare with --merge: that replaces the stored flat claims, which a later separate filing reads as the holder's own, so state the holder's own claims again when switching back."
const EXAMPLE = "--parents me=<n>"
const HINT = hint(EXAMPLE)
const CLAIMS = KEPT + HINT

describe("a partner's claims a Return does not claim", () => {
	it.each([
		["married_joint", CLAIMS],
		["married_no_income_spouse", KEPT + OLDER],
		["single", KEPT],
	])("are unclaimed under %s, with how to claim only where safe", async (status, sentence) => {
		const home = await separate("--parents", "partner=2")
		const res = await refile(home, status)
		expect(unclaimed(res)).toEqual([sentence])
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
		// The printed command, with the holder's own count, restores the separate Returns.
		const back = [
			"--filing-status",
			"married_separate",
			...EXAMPLE.replace("<n>", "0").split(" "),
			"--merge",
		]
		expect(HINT).toContain(`for example --filing-status married_separate ${EXAMPLE} --merge.`)
		expect((await tax(home, ...back)).code).toBe(0)
		expect(await filed(home)).toEqual([
			["me", "83000.00"],
			["partner", "6500.00"],
		])
	})

	it("takes the example flag from a claim the kept set holds", async () => {
		const home = await separate("--life-insurance", "partner=80000")
		const res = await refile(home, "married_joint")
		const example = "--life-insurance me=<amount>"
		const sentence = KEPT + hint(example)
		expect(unclaimed(res)).toEqual([sentence])
		expect(sentence).toContain(`for example --filing-status married_separate ${example} --merge.`)
		expect((await tax(home, "--merge", "--life-insurance", "80000")).code).toBe(0)
		expect((await refile(home, "married_separate")).code).toBe(0)
		// me's own life insurance is nothing; the printed command states that again.
		const back = [
			"--filing-status",
			"married_separate",
			...example.replace("<amount>", "0").split(" "),
			"--merge",
		]
		expect((await tax(home, ...back)).code).toBe(0)
		expect(await filed(home)).toEqual([
			["me", "83000.00"],
			["partner", "5500.00"],
		])
	})

	it("keeps the older words when the plan names no holder", async () => {
		const home = await separate("--parents", "partner=2")
		const gone = await scenario(home, ["household", "base", "--none"])
		expect(gone.code, gone.err).toBe(0)
		const res = await refile(home, "married_joint")
		expect(unclaimed(res)).toEqual([KEPT + OLDER])
	})

	it("keeps the older words when the flat claims' person has no taxed income", async () => {
		const home = await separate("--parents", "partner=2")
		const document = await documentOf(home)
		const flows = (document["flows"] as { id: string }[]).filter((flow) => flow.id !== "salary")
		expect((await applyScenario(home, "base", { ...document, flows })).code).toBe(0)
		expect((await refile(home, "married_separate")).code).toBe(0)
		expect(unclaimed(await refile(home, "married_joint"))).toEqual([KEPT + OLDER])
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
