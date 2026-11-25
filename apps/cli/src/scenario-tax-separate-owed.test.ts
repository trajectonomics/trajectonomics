import { describe, expect, it } from "bun:test"
import { couple, coupleHousehold, TWO_SALARIES, taxCouple } from "./scenario-tax-filers-support"
import { LABELS, year2026 } from "./scenario-tax-separate-support"

describe("the tax a separate Return owes, by hand", () => {
	/*
	 * Salaries of 1,000,000 and 500,000, filed separately (s.57 sexies para 1). Each Return has its
	 * own 100,000 expense ceiling and its own 60,000 personal allowance; neither claims a spouse.
	 *   me       1,000,000 - 100,000 - 60,000 = 840,000
	 *            0 + 7,500 + 20,000 + 37,500 + 20% of 90,000 = 83,000
	 *   partner    500,000 - 100,000 - 60,000 = 340,000
	 *            0 + 7,500 + 10% of 40,000 = 11,500
	 */
	it("states each Return's own tax year, with its levy and filer", async () => {
		const home = await couple(TWO_SALARIES, coupleHousehold())
		expect((await taxCouple(home, "married_separate", LABELS)).code).toBe(0)
		const years = await year2026(home)
		expect(years.map((it) => [it.filer, it.due])).toEqual([
			["me", "83000.00"],
			["partner", "11500.00"],
		])
		expect(years.map((it) => it.levy)).toEqual(["th-2026-pit@me", "th-2026-pit@partner"])
	})

	it("keeps a plan without Filers as it was, with no filer on its tax year", async () => {
		const home = await couple(TWO_SALARIES, null)
		expect((await taxCouple(home, "married_joint", LABELS)).code).toBe(0)
		const [year] = await year2026(home)
		expect(year).toBeDefined()
		expect(year).not.toHaveProperty("filer")
		expect(year?.levy).toBe("th-2026-pit")
	})
})
