import { describe, expect, it } from "bun:test"
import { setHousehold } from "./scenario-household-support"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, pay, year2026 } from "./scenario-tax-separate-support"
import { errorOf, resultOf, scenario } from "./scenario-test-support"

/* The claims each Return of a separate filing keeps (cli ADR-0075, ADR-0066). */

const tax = (home: string, ...flags: string[]) => scenario(home, ["tax", "base", ...flags])
const profileOf = async (home: string) =>
	resultOf(await scenario(home, ["show", "base"])).scenario.tax

describe("a separate profile stored before the plan had Owners", () => {
	/*
	 * me: 1,000,000 - 100,000 expenses - 60,000 personal - 60,000 children - 60,000 parents
	 * - 50,000 life insurance = 670,000, so 0 + 7,500 + 20,000 + 15% of 170,000 = 53,000.
	 */
	it("gives the holder's Return the holder's claims on --from-stored, and stores them", async () => {
		const home = await couple(TWO_SALARIES, null)
		const claims = ["--children", "2", "--parents", "2", "--life-insurance", "50000"]
		expect((await taxCouple(home, "married_separate", LABELS, claims)).code).toBe(0)
		expect(await profileOf(home)).not.toHaveProperty("returns")
		expect((await setHousehold(home, coupleHousehold())).code).toBe(0)
		const again = await tax(home, "--from-stored")
		expect(again.code, again.err).toBe(0)
		expect((await profileOf(home)).returns).toEqual({
			me: { children: 2, childrenAtHigherRate: 0, parents: 2, lifeInsurance: 50000 },
			partner: { children: 0, childrenAtHigherRate: 0 },
		})
		expect((await year2026(home)).map((it) => [it.filer, it.due])).toEqual([
			["me", "53000.00"],
			["partner", "11500.00"],
		])
	})
})

describe("a switch to joint and back", () => {
	it("keeps the partner's Return, and takes the holder's claims from the joint Return", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const claims = ["--parents", "partner=2", "--children", "1"]
		expect((await taxCouple(home, "married_separate", LABELS, claims)).code).toBe(0)
		const joined = await tax(home, "--merge", "--filing-status", "married_joint")
		expect(joined.code, joined.err).toBe(0)
		// The joint Levy ignores the partner's Return, so it states no parents.
		expect(resultOf(joined).allowances.stated).toEqual(["children"])
		expect((await profileOf(home)).returns).toEqual({
			partner: { children: 0, childrenAtHigherRate: 0, parents: 2 },
		})
		expect(resultOf(await tax(home, "--from-stored"))).toMatchObject({ status: "unchanged" })
		expect((await tax(home, "--merge", "--life-insurance", "1000")).code).toBe(0)
		expect((await tax(home, "--merge", "--filing-status", "married_separate")).code).toBe(0)
		expect((await profileOf(home)).returns).toEqual({
			me: { children: 1, childrenAtHigherRate: 0, lifeInsurance: 1000 },
			partner: { children: 0, childrenAtHigherRate: 0, parents: 2 },
		})
	})

	it("states the profile whole with --tax, so it drops what the flags leave out", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const claims = ["--parents", "partner=2"]
		expect((await taxCouple(home, "married_separate", LABELS, claims)).code).toBe(0)
		expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
		expect(await profileOf(home)).not.toHaveProperty("returns")
	})
})

describe("a household removed and set again", () => {
	/*
	 * me: 1,000,000 - 100,000 expenses - 60,000 personal - 30,000 parent = 810,000, so 65,000 up to
	 * 750,000 and 20% of 60,000 = 77,000. The old Return's two parents and 80,000 of life insurance
	 * would owe 57,500.
	 */
	it("files what the caller changed in between, not the holder's old Return", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const old = ["--parents", "me=2", "--life-insurance", "me=80000"]
		expect((await taxCouple(home, "married_separate", LABELS)).code).toBe(0)
		expect((await tax(home, "--merge", ...old)).code).toBe(0)
		expect((await scenario(home, ["household", "base", "--none"])).code).toBe(0)
		const changed = await tax(home, "--merge", "--parents", "1", "--life-insurance", "0")
		expect(changed.code, changed.err).toBe(0)
		expect(await profileOf(home)).not.toHaveProperty("returns")
		expect((await setHousehold(home, coupleHousehold())).code).toBe(0)
		expect((await tax(home, "--from-stored")).code).toBe(0)
		const profile = await profileOf(home)
		expect(profile).toMatchObject({ parents: 1, returns: { me: { parents: 1 } } })
		expect(profile).not.toHaveProperty("lifeInsurance")
		expect((await year2026(home)).map((it) => [it.filer, it.due])).toEqual([
			["me", "77000.00"],
			["partner", "11500.00"],
		])
	})
})

describe("a holder with no Return", () => {
	const ONE_SALARY = { ...TWO_SALARIES, flows: [pay("salary", 100_000_000)] }
	const LABEL = ["--label", "salary=income.section40_1"]
	const PARTNERS = coupleHousehold([{ path: "flows.salary", person: "partner" }])

	it("refuses a bare value, which no Return would carry, at its flag", async () => {
		const home = await couple(ONE_SALARY, PARTNERS)
		const res = await taxCouple(home, "married_separate", LABEL, ["--parents", "1"])
		expect(res.code, res.out).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
		expect(errorOf(res).message).toContain('"me"')
		expect((await taxCouple(home, "married_separate", LABEL)).code).toBe(0)
		const merged = await tax(home, "--merge", "--life-insurance", "1000")
		expect(errorOf(merged)).toMatchObject({ path: "--life-insurance" })
		expect((await taxCouple(home, "married_joint", LABEL, ["--parents", "1"])).code).toBe(0)
	})

	it("keeps the claims in the flat keys, so an id unfit as a Filer's is never a Return's", async () => {
		const [me, partner] = PARTNERS.people
		const people = [{ ...me!, id: "My Self" }, partner!]
		const home = await couple(ONE_SALARY, { ...PARTNERS, people })
		expect((await taxCouple(home, "married_joint", LABEL, ["--parents", "1"])).code).toBe(0)
		const res = await tax(home, "--merge", "--filing-status", "married_separate")
		expect(res.code, res.err).toBe(0)
		expect(await profileOf(home)).toMatchObject({ parents: 1 })
		expect(Object.keys((await profileOf(home)).returns)).toEqual(["partner"])
	})
})

describe("a person-qualified value", () => {
	const ONE_SALARY = { ...TWO_SALARIES, flows: [pay("salary", 100_000_000)] }
	const OWNED = coupleHousehold([{ path: "flows.salary", person: "me" }])
	const LABEL = ["--label", "salary=income.section40_1"]

	it("is refused at its flag when the person has no Return", async () => {
		const home = await couple(ONE_SALARY, OWNED)
		const extra = ["--parents", "partner=2"]
		const res = await taxCouple(home, "married_separate", LABEL, extra)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
		expect(errorOf(res).message).toContain('"partner"')
		expect((await taxCouple(home, "married_separate", LABEL)).code).toBe(0)
		const merged = await tax(home, "--merge", "--life-insurance", "partner=1000")
		expect(errorOf(merged)).toMatchObject({ path: "--life-insurance" })
	})

	it("is refused as naming neither person on a plan that already files separately", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		expect((await taxCouple(home, "married_separate", LABELS)).code).toBe(0)
		const res = await tax(home, "--merge", "--parents", "ghost=1")
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
		expect(errorOf(res).message).toContain('"ghost" is neither the holder nor the partner')
	})

	it("is refused as stated twice beside the holder's bare value", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		const extra = ["--parents", "1", "--parents", "me=2"]
		const res = await taxCouple(home, "married_separate", LABELS, extra)
		expect(res.code).toBe(2)
		expect(errorOf(res)).toMatchObject({ code: "invalid_input", path: "--parents" })
		expect(errorOf(res).message).toContain("twice")
	})
})
