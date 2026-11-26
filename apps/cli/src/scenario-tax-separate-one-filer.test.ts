import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { documentOf, LABELS } from "./scenario-tax-separate-support"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

/* A separate filing names each person whose stored claims no Return of it claims (cli ADR-0075). */

const noReturn = (person: string) =>
	`"${person}" has no taxed income in this plan, so no Return claims their stored claims.`

/** The couple's separate filing, then one salary removed and the Levy written again from the profile. */
async function withoutSalary(removed: string, claims: readonly string[]) {
	const home = await couple(TWO_SALARIES, coupleHousehold())
	const first = await taxCouple(home, "married_separate", LABELS, claims)
	expect(first.code, first.err).toBe(0)
	expect(resultOf(first).unclaimed).toBeUndefined()
	const document = await documentOf(home)
	const flows = (document["flows"] as { id: string }[]).filter((flow) => flow.id !== removed)
	const applied = await applyScenario(home, "base", { ...document, flows })
	expect(applied.code, applied.err).toBe(0)
	const again = await scenario(home, ["tax", "base", "--from-stored"])
	expect(again.code, again.err).toBe(0)
	return { home, result: resultOf(again) }
}

describe("a separate filing with one Filer", () => {
	it("names the partner whose salary is gone, on this write and the next", async () => {
		const { home, result } = await withoutSalary("partner-salary", ["--parents", "partner=2"])
		expect(result.filers).toEqual(["me"])
		expect(result.unclaimed).toEqual([noReturn("partner")])
		const next = await scenario(home, ["tax", "base", "--merge", "--life-insurance", "1000"])
		expect(resultOf(next).unclaimed).toEqual([noReturn("partner")])
	})

	/* The holder's claims are the profile's flat ones, so no entry of the stored `returns` is theirs. */
	it("names the holder whose salary is gone", async () => {
		const { result } = await withoutSalary("salary", ["--parents", "1"])
		expect(result.filers).toEqual(["partner"])
		expect(result.unclaimed).toEqual([noReturn("me")])
	})

	it.each([
		["partner-salary", ["--parents", "1"]],
		["salary", ["--parents", "partner=1"]],
		["partner-salary", []],
	])("says nothing without %s when that person claims nothing", async (removed, claims) => {
		const { result } = await withoutSalary(removed, claims)
		expect(result.filers).toHaveLength(1)
		expect(result).not.toHaveProperty("unclaimed")
	})
})
