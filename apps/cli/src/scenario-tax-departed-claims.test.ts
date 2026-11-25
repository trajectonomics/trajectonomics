import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, year2026 } from "./scenario-tax-separate-support"
import { resultOf, scenario } from "./scenario-test-support"
import type { AssumptionView } from "./tax-assumptions"

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

/** What a successful write assumes. */
async function assumed(home: string, ...flags: string[]): Promise<AssumptionView[]> {
	const res = await tax(home, ...flags)
	expect(res.code, res.err).toBe(0)
	return resultOf(res).assumptions as AssumptionView[]
}

/** The entries for stored claims, one per id. */
const stored = (found: readonly AssumptionView[]) =>
	found.filter((it) => it.path.startsWith("returns."))
const reported = async (home: string, ...flags: string[]) =>
	stored(await assumed(home, ...flags)).map((it) => it.path)

describe("a holder given a new id after claims were stated", () => {
	it.each([
		["--from-stored", ["--from-stored"]],
		["--merge", ["--merge", "--parents", "alice=1"]],
		["a dry run", ["--from-stored", "--dry-run"]],
	])("is reported by %s, naming the old id", async (_how, flags) => {
		const home = await rehoused(CLAIM, ALICE)
		const [entry, ...more] = stored(await assumed(home, ...flags))
		expect(more).toEqual([])
		expect(entry).toMatchObject({ path: "returns.me", value: 0, status: "unsourced" })
		expect(entry?.note).toContain(
			'The claims stored for "me", who is not in the household, are not counted on any Return.',
		)
		expect(entry?.note).toContain("--tax or <person>=<value> flags")
	})

	it("is reported by every later separate write, while the claims sit on no Return", async () => {
		const home = await rehoused(CLAIM, ALICE)
		expect(await reported(home, "--from-stored")).toEqual(["returns.me"])
		// Without the 80,000 alice owes 83,000.00, where the Return of "me" owed 67,000.00.
		expect((await owed(home))["alice"]).toBe("83000.00")
		expect(await reported(home, "--from-stored")).toEqual(["returns.me"])
		expect(await reported(home, "--merge", "--parents", "partner=1")).toEqual(["returns.me"])
		// Stated again for alice, they are counted; the old set is still stored on no Return.
		const again = ["--merge", "--life-insurance", "alice=80000"]
		expect(await reported(home, ...again)).toEqual(["returns.me"])
		expect((await owed(home))["alice"]).toBe("67000.00")
		expect(await reported(home, ...WHOLE)).toEqual([])
		expect(await reported(home, "--from-stored")).toEqual([])
	})

	it("is reported from the first write that stops counting the claims", async () => {
		const home = await rehoused(CLAIM, ALICE)
		// A joint Return is one Return and carries the flat claims whoever the holder is.
		expect(await reported(home, ...JOINT)).toEqual([])
		expect(await reported(home, ...SEPARATE)).toEqual(["returns.me"])
		// Once moved off the flat keys, a joint Return names them in the kept-claims note alone.
		const joined = await assumed(home, ...JOINT)
		expect(stored(joined)).toEqual([])
		expect(joined.map((it) => it.note).join()).toContain('The claims stored for "me" are kept')
	})
})

describe("a partner given a new id after claims were stated", () => {
	it("is reported, naming the old id", async () => {
		const home = await rehoused(["--life-insurance", "partner=50000"], MARRIED)
		const before = await owed(home)
		expect(before["partner"]).toBe("7000.00")
		expect((await setHousehold(home, BOB)).code).toBe(0)
		expect(await reported(home, "--from-stored")).toEqual(["returns.partner"])
		expect((await owed(home))["bob"]).toBe("11500.00")
		expect(await reported(home, "--from-stored")).toEqual(["returns.partner"])
	})

	it("has an entry of its own beside the holder's", async () => {
		const claims = [...CLAIM, "--life-insurance", "partner=50000"]
		const home = await rehoused(claims, renamed("partner", "bob", ALICE))
		expect(await reported(home, "--from-stored")).toEqual(["returns.me", "returns.partner"])
	})
})

describe("a separate write with no Filers", () => {
	it("names each stored claim set once, a departed id in its own entry", async () => {
		const claims = [...CLAIM, "--life-insurance", "partner=50000"]
		const home = await rehoused(claims, renamed("me", "alice", coupleHousehold([])))
		const found = await assumed(home, "--from-stored")
		const [entry, ...more] = stored(found)
		expect(more).toEqual([])
		expect(entry?.path).toBe("returns.me")
		// A person-qualified value is refused without Filers, so the note offers none.
		expect(entry?.note).toContain("for example with --tax.")
		expect(entry?.note).not.toContain("<person>")
		const kept = found.find((it) => it.path === "allowances.mortgageInterestCeiling")
		expect(kept?.note).toContain('The claims stored for "partner" are kept')
		expect(kept?.note).not.toContain('"me"')
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
		expect(await reported(home, "--from-stored")).toEqual([])
	})
})
