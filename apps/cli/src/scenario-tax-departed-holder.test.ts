import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS } from "./scenario-tax-separate-support"
import { resultOf, scenario } from "./scenario-test-support"
import type { AssumptionView } from "./tax-assumptions"

/* A recorded claims holder who is given a new id leaves claims no Return carries (cli ADR-0075). */

const MARRIED = coupleHousehold()

/** The same household with the holder "me" given the id "alice". */
const RENAMED: typeof MARRIED = {
	...MARRIED,
	people: MARRIED.people.map((it) => (it.id === "me" ? { ...it, id: "alice" } : it)),
	owners: (MARRIED.owners ?? []).map((it) =>
		it.person === "me" ? { ...it, person: "alice" } : it,
	),
}

const CLAIM: readonly string[] = ["--life-insurance", "80000"]

const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])

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

/** The entries a successful write adds about the recorded claims holder. */
async function reported(home: string, ...flags: string[]): Promise<AssumptionView[]> {
	const res = await tax(home, ...flags)
	expect(res.code, res.err).toBe(0)
	const found = resultOf(res).assumptions as AssumptionView[]
	return found.filter((it) => it.path === "claimsHolder")
}

describe("a holder given a new id after claims were stated", () => {
	it.each([
		["--from-stored", ["--from-stored"]],
		["--merge", ["--merge", "--parents", "alice=1"]],
		["a dry run", ["--from-stored", "--dry-run"]],
	])("is reported by %s, naming the old id", async (_how, flags) => {
		const home = await rehoused(CLAIM, RENAMED)
		const [entry, ...more] = await reported(home, ...flags)
		expect(more).toEqual([])
		expect(entry).toMatchObject({ value: 0, status: "unsourced" })
		expect(entry?.note).toContain('The claims stored for "me", who is not in the household')
		expect(entry?.note).toContain("not counted on any Return until they are stated again")
		expect(entry?.note).toContain("--tax or <person>=<value> flags")
	})

	it("is reported once, by the write that records the new holder", async () => {
		const home = await rehoused(CLAIM, RENAMED)
		expect(await reported(home, "--from-stored")).toHaveLength(1)
		const profile = resultOf(await scenario(home, ["show", "base"])).scenario.tax
		expect(profile).toMatchObject({ claimsHolder: "alice" })
		expect(profile.returns.me.lifeInsurance).toBe(80000)
		expect(await reported(home, "--from-stored")).toEqual([])
	})

	it("is not reported by a write of the whole profile", async () => {
		const home = await rehoused(CLAIM, RENAMED)
		const whole = ["--tax", "th-2026", "--filing-status", "married_separate"]
		expect(await reported(home, ...whole)).toEqual([])
	})

	it("waits for the first write that stops counting the claims", async () => {
		const home = await rehoused(CLAIM, RENAMED)
		// A joint Return is one Return and carries the flat claims whoever the holder is.
		expect(await reported(home, "--merge", "--filing-status", "married_joint")).toEqual([])
		expect(await reported(home, "--merge", "--filing-status", "married_separate")).toHaveLength(1)
	})
})

describe("a write with nothing left behind", () => {
	it.each([
		["the old holder claimed nothing", [], RENAMED],
		["only the partner claimed", ["--life-insurance", "partner=80000"], RENAMED],
		["the plan has no household", CLAIM, null],
		["the holder keeps their id", CLAIM, MARRIED],
	])("says nothing when %s", async (_when, claims, household) => {
		const home = await rehoused(claims, household)
		expect(await reported(home, "--from-stored")).toEqual([])
	})
})
