import { describe, expect, it } from "bun:test"
import { backupPath } from "./backup/testing"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, year2026 } from "./scenario-tax-separate-support"
import { resultOf, scenario } from "./scenario-test-support"
import { tempHome } from "./store/testing"
import { capture } from "./test-support"

/* Whose claims the flat keys of a stored profile are, when the household swaps roles (cli ADR-0075). */

const MARRIED = coupleHousehold()
const [ME, PARTNER] = MARRIED.people

/** The same two people with the roles swapped: "partner" is the holder, "me" the partner. */
const SWAPPED: typeof MARRIED = {
	...MARRIED,
	people: [
		{ id: "partner", role: "holder", born: PARTNER!.born, lifeExpectancy: 90 },
		{ id: "me", role: "partner", born: ME!.born, lifeExpectancy: 90 },
	],
}

/*
 * 80,000 of life insurance, on one Return only:
 *   with it    me      1,000,000 - 100,000 - 60,000 - 80,000 = 760,000, so 65,000 + 20% of 10,000
 *              partner   500,000 - 100,000 - 60,000 - 80,000 = 260,000, so 5% of 110,000
 *   without    me 840,000 owes 83,000; partner 340,000 owes 11,500
 * Claimed on both, the couple would owe 72,500.
 */
const MINE = { me: "67000.00", partner: "11500.00" }
const THEIRS = { me: "83000.00", partner: "5500.00" }

const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const profileOf = async (home: string) =>
	resultOf(await scenario(home, ["show", "base"])).scenario.tax
const owed = async (home: string) =>
	Object.fromEntries((await year2026(home)).map((it) => [it.filer, it.due]))

/** The household set, and the tax written again from the stored profile. */
async function rewrite(home: string, household: typeof MARRIED): Promise<void> {
	expect((await setHousehold(home, household)).code).toBe(0)
	const res = await tax(home, "--from-stored")
	expect(res.code, res.err).toBe(0)
}

/** The couple filing separately, with 80,000 of life insurance on one of them. */
async function insured(person: "me" | "partner"): Promise<string> {
	const home = await couple(TWO_SALARIES, MARRIED)
	const claim = ["--life-insurance", `${person}=80000`]
	expect((await taxCouple(home, "married_separate", LABELS, claim)).code).toBe(0)
	return home
}

describe("a household that swaps which person is the holder", () => {
	it.each([
		["me", MINE],
		["partner", THEIRS],
	] as const)("leaves the claims of %s theirs, there and back", async (person, due) => {
		const home = await insured(person)
		expect(await owed(home)).toEqual(due)
		await rewrite(home, SWAPPED)
		expect(await owed(home)).toEqual(due)
		const swapped = await profileOf(home)
		expect(swapped.claimsHolder).toBe("partner")
		expect(swapped.lifeInsurance).toBe(person === "partner" ? 80000 : undefined)
		expect(swapped.returns[person].lifeInsurance).toBe(80000)
		await rewrite(home, MARRIED)
		expect(await owed(home)).toEqual(due)
		expect((await profileOf(home)).claimsHolder).toBe("me")
	})

	it("puts a merge's bare value on the new holder, and moves the old one's claims", async () => {
		const home = await insured("me")
		expect((await setHousehold(home, SWAPPED)).code).toBe(0)
		expect((await tax(home, "--merge", "--parents", "1")).code).toBe(0)
		const profile = await profileOf(home)
		expect(profile).toMatchObject({ claimsHolder: "partner", parents: 1 })
		expect(profile).not.toHaveProperty("lifeInsurance")
		expect(profile.returns).toMatchObject({
			me: { lifeInsurance: 80000 },
			partner: { parents: 1 },
		})
	})

	it("leaves them theirs when the household was removed in between", async () => {
		const home = await insured("me")
		expect((await scenario(home, ["household", "base", "--none"])).code).toBe(0)
		expect((await tax(home, "--from-stored")).code).toBe(0)
		await rewrite(home, SWAPPED)
		expect(await owed(home)).toEqual(MINE)
	})

	it("leaves them theirs through a joint Return written after the swap", async () => {
		const home = await insured("me")
		expect((await tax(home, "--merge", "--filing-status", "married_joint")).code).toBe(0)
		await rewrite(home, SWAPPED)
		// The joint Return is one Return: its claims stay as they were, and stay recorded as me's.
		expect(await profileOf(home)).toMatchObject({ claimsHolder: "me", lifeInsurance: 80000 })
		expect((await tax(home, "--merge", "--filing-status", "married_separate")).code).toBe(0)
		expect(await owed(home)).toEqual(MINE)
	})
})

describe("whose claims a stored profile records", () => {
	it("is carried through backup and restore", async () => {
		const home = await insured("me")
		const backup = backupPath()
		expect((await capture(["backup", "--out", backup, "--json"], { TRAJ_HOME: home })).code).toBe(0)
		const restored = tempHome()
		expect((await capture(["restore", backup, "--json"], { TRAJ_HOME: restored })).code).toBe(0)
		expect(await profileOf(restored)).toEqual(await profileOf(home))
		expect((await profileOf(restored)).claimsHolder).toBe("me")
	})

	it.each([
		["no household", null],
		["a household with no Owners", coupleHousehold([])],
	])("is nothing for a plan with %s, and such a profile still reads", async (_what, household) => {
		const home = await couple(TWO_SALARIES, household)
		const claim = ["--life-insurance", "80000"]
		expect((await taxCouple(home, "married_separate", LABELS, claim)).code).toBe(0)
		expect((await tax(home, "--from-stored")).code).toBe(0)
		expect(await profileOf(home)).toEqual({
			tax: "th-2026",
			filingStatus: "married_separate",
			children: 0,
			childrenAtHigherRate: 0,
			lifeInsurance: 80000,
		})
		// With nothing recorded, the flat claims are the current holder's.
		await rewrite(home, SWAPPED)
		expect(await owed(home)).toEqual(THEIRS)
		expect((await profileOf(home)).claimsHolder).toBe("partner")
	})
})

describe("the switch-back caveat when the roles swap before a joint Return", () => {
	it("names the recorded claims holder and prints a command that restores the tax", async () => {
		const home = await couple(TWO_SALARIES, MARRIED)
		const first = await taxCouple(home, "married_separate", LABELS, ["--parents", "partner=2"])
		expect(first.code, first.err).toBe(0)
		expect(await owed(home)).toEqual({ me: "83000.00", partner: "6500.00" })
		expect((await setHousehold(home, SWAPPED)).code).toBe(0)
		const joint = await tax(home, "--merge", "--filing-status", "married_joint")
		expect(joint.code, joint.err).toBe(0)
		const [sentence] = resultOf(joint).unclaimed as string[]
		// The bare claims are "me"'s, who is the partner now, not the household's holder.
		expect(sentence).toContain('so state "me"\'s own claims again when switching back')
		expect(sentence).not.toContain('"partner"\'s own claims')
		const example = "--parents me=<n>"
		expect(sentence).toContain(`for example --filing-status married_separate ${example} --merge.`)
		const back = [
			"--filing-status",
			"married_separate",
			...example.replace("<n>", "0").split(" "),
			"--merge",
		]
		expect((await tax(home, ...back)).code).toBe(0)
		expect(await owed(home)).toEqual({ me: "83000.00", partner: "6500.00" })
	})
})
