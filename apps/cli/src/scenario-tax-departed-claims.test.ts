import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, year2026 } from "./scenario-tax-separate-support"
import { resultOf, scenario } from "./scenario-test-support"

/* Claims stored under an id no longer in the household sit on no Return (cli ADR-0075). */

const MARRIED = coupleHousehold()

/** The household with one person given a new id. */
function renamed(from: string, to: string, household = MARRIED): typeof MARRIED {
	const as = (id: string) => (id === from ? to : id)
	return {
		...household,
		people: household.people.map((it) => ({ ...it, id: as(it.id) })),
		owners: (household.owners ?? []).map((it) => ({ ...it, person: as(it.person) })),
	}
}

const ALICE = renamed("me", "alice")
const BOB = renamed("partner", "bob")

const CLAIM: readonly string[] = ["--life-insurance", "80000"]
const WHOLE = ["--tax", "th-2026", "--filing-status", "married_separate"]
const SEPARATE = ["--merge", "--filing-status", "married_separate"]
const JOINT = ["--merge", "--filing-status", "married_joint"]
const SINGLE = ["--merge", "--filing-status", "single"]

const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const owed = async (home: string) =>
	Object.fromEntries((await year2026(home)).map((it) => [it.filer, it.due]))

/** The couple filing separately with these claims, and then this household or none. */
async function rehoused(claims: readonly string[], household: typeof MARRIED | null) {
	const home = await couple(TWO_SALARIES, MARRIED)
	expect((await taxCouple(home, "married_separate", LABELS, claims)).code).toBe(0)
	const set =
		household === null
			? await scenario(home, ["household", "base", "--none"])
			: await setHousehold(home, household)
	expect(set.code, set.err).toBe(0)
	return home
}

/** What a successful write leaves unclaimed; absent reads as nothing. */
async function unclaimed(home: string, ...flags: string[]): Promise<string[]> {
	const res = await tax(home, ...flags)
	expect(res.code, res.err).toBe(0)
	return resultOf(res).unclaimed ?? []
}

/** The sentence for an id no person in the household has, with the example a write with Filers gives. */
function departed(id: string, holder: string): string {
	return `The claims stored for "${id}", who is not in the household, are on no Return. State any that still apply for a person in the household, for example with "<person>=<value>" flags such as --life-insurance ${holder}=<amount>, or with --tax; if those claims are already stated for another person, a --tax write drops this set. scenario show lists them under returns until then.`
}

/** The same sentence on a write with no Filers, which refuses a person-qualified value. */
function departedNoFilers(id: string): string {
	return `The claims stored for "${id}", who is not in the household, are on no Return. State any that still apply for a person in the household; if those claims are already stated for another person, a --tax write drops this set. scenario show lists them under returns until then.`
}

describe("a holder given a new id after claims were stated", () => {
	it.each([
		["--from-stored", ["--from-stored"]],
		["--merge", ["--merge", "--parents", "alice=1"]],
		["a dry run", ["--from-stored", "--dry-run"]],
	])("is named by %s, under the old id", async (_how, flags) => {
		const home = await rehoused(CLAIM, ALICE)
		expect(await unclaimed(home, ...flags)).toEqual([departed("me", "alice")])
	})

	it("stays named by every later separate write while the claims sit on no Return", async () => {
		const home = await rehoused(CLAIM, ALICE)
		expect(await unclaimed(home, "--from-stored")).toEqual([departed("me", "alice")])
		// Without the 80,000 alice owes 83,000.00, where the Return of "me" owed 67,000.00.
		expect((await owed(home))["alice"]).toBe("83000.00")
		expect(await unclaimed(home, "--merge", "--parents", "partner=1")).toEqual([
			departed("me", "alice"),
		])
		// Stated again for alice, they are counted; the old set is still stored on no Return.
		const again = ["--merge", "--life-insurance", "alice=80000"]
		expect(await unclaimed(home, ...again)).toEqual([departed("me", "alice")])
		expect((await owed(home))["alice"]).toBe("67000.00")
		// The sentence names where the set is: scenario show keeps it under `returns` until --tax.
		const shown = resultOf(await scenario(home, ["show", "base"])).scenario
		expect(shown.tax.returns.me).toMatchObject({ lifeInsurance: 80000 })
		expect(await unclaimed(home, ...WHOLE)).toEqual([])
		expect(await unclaimed(home, "--from-stored")).toEqual([])
	})

	it("is not named by the joint write that counts the flat claims, but by the next separate one", async () => {
		const home = await rehoused(CLAIM, ALICE)
		// A joint Return is one Return and carries the flat claims whoever the holder is.
		expect(await unclaimed(home, ...JOINT)).toEqual([])
		expect(await unclaimed(home, ...SEPARATE)).toEqual([departed("me", "alice")])
		// The departed sentence never says the set waits for a separate filing.
		expect((await unclaimed(home, ...SEPARATE)).join()).not.toContain("kept for a separate filing")
	})
})

describe("a partner given a new id after claims were stated", () => {
	it("is named by a joint write, which counts no stored set", async () => {
		const home = await rehoused(["--life-insurance", "partner=50000"], BOB)
		expect((await owed(home))["partner"]).toBe("7000.00")
		// A joint Return counts only the flat claims, so the old partner's set is on no Return.
		expect(await unclaimed(home, ...JOINT)).toEqual([departed("partner", "me")])
		expect(await unclaimed(home, ...SINGLE)).toEqual([departedNoFilers("partner")])
		expect(await unclaimed(home, ...SEPARATE)).toEqual([departed("partner", "me")])
		expect((await owed(home))["bob"]).toBe("11500.00")
	})

	it("has a sentence of its own beside the holder's", async () => {
		const claims = [...CLAIM, "--life-insurance", "partner=50000"]
		const home = await rehoused(claims, renamed("partner", "bob", ALICE))
		expect(await unclaimed(home, "--from-stored")).toEqual([
			departed("me", "alice"),
			departed("partner", "alice"),
		])
	})
})

describe("a separate write with no Filers", () => {
	it("names each stored claim set once, and no departed one as having no income", async () => {
		const claims = [...CLAIM, "--life-insurance", "partner=50000"]
		const home = await rehoused(claims, renamed("me", "alice", coupleHousehold([])))
		const found = await unclaimed(home, "--from-stored")
		expect(found).toHaveLength(2)
		expect(found[0]).toContain('The claims stored for "partner" are kept')
		expect(found[0]).not.toContain('"me"')
		expect(found[0]).not.toContain("with --merge")
		expect(found[1]).toBe(departedNoFilers("me"))
		expect(found.join()).not.toContain("has no taxed income")
	})
})

describe("a write with nothing left behind", () => {
	it.each([
		["the old holder claimed nothing", [], ALICE],
		["the old partner claimed nothing", [], BOB],
		["the plan has no household", CLAIM, null],
		["everyone keeps their id", [...CLAIM, "--life-insurance", "partner=50000"], MARRIED],
	])("says nothing when %s", async (_when, claims, household) => {
		const home = await rehoused(claims, household)
		expect(await unclaimed(home, "--from-stored")).toEqual([])
	})
})
