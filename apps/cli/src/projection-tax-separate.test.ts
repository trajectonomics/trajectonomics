import { describe, expect, it } from "bun:test"
import { carryInFile, MID_PERIOD } from "./projection/carry-in-support"
import { projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import {
	COUPLE_OWNERS,
	COUPLE_PLAN,
	couple,
	coupleHousehold,
	taxCouple,
} from "./scenario-tax-filers-support"

/* The readers of a separate Return's Levy set (cli ADR-0075): carry-in and allowances per Levy. */

/** A taxed separate plan of the couple, and its home. */
async function separateHome(): Promise<string> {
	const home = await couple(COUPLE_PLAN, coupleHousehold(COUPLE_OWNERS))
	expect((await taxCouple(home, "married_separate")).code).toBe(0)
	return home
}

/** One `--carry-in` record per Levy, every class at zero through `rest`. */
function records(): unknown[] {
	return ["th-2026-pit@me", "th-2026-pit@partner"].map((levy) => ({
		scenario: "base",
		levy,
		periodStart: "2026-01-01",
		tallies: [],
		prepaid: "0.00",
		rest: "0.00",
	}))
}

describe("a Carry-in for a separate Return", () => {
	it("takes one record per Levy and echoes both", async () => {
		const home = await separateHome()
		const res = await projection(home, [
			"run",
			"--scenario",
			"base",
			...MID_PERIOD,
			"--carry-in",
			carryInFile(home, records()),
		])
		expect(res.code, res.err).toBe(0)
		const echoed = runBody(res).carryIn ?? []
		expect(echoed.map((it) => it.levy)).toEqual(["th-2026-pit@me", "th-2026-pit@partner"])
	})
})

describe("projection allowances of a separate Return", () => {
	it("answers per Return, naming the Levy and the Filer label it read", async () => {
		const home = await separateHome()
		const res = await projection(home, [
			"allowances",
			"--scenario",
			"base",
			"--as-of",
			"2026-01-01",
			"--horizon",
			"2027-12-31",
			"--labels",
			"allowance.retirement.rmf@me,allowance.retirement.rmf@partner",
			"--step",
			"1000",
		])
		expect(res.code, res.err).toBe(0)
		const body = runBody(res) as unknown as {
			taxYears: { levy: string }[]
			allowances: { levy: string; label: string }[]
		}
		expect([...new Set(body.taxYears.map((it) => it.levy))]).toEqual([
			"th-2026-pit@me",
			"th-2026-pit@partner",
		])
		expect([...new Set(body.allowances.map((it) => `${it.levy} ${it.label}`))]).toEqual([
			"th-2026-pit@me allowance.retirement.rmf@me",
			"th-2026-pit@partner allowance.retirement.rmf@partner",
		])
	})
})
