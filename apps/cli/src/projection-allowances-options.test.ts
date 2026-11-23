import { describe, expect, it } from "bun:test"
import { carryInFile, thRecord } from "./projection/carry-in-support"
import {
	allowances,
	allowancesHome,
	bodyOf,
	ESG,
	planFlags,
	RMF,
	withFlag,
} from "./projection-allowances-support"

describe("projection allowances limits", () => {
	it("stops a label at --budget, and says the budget is used", async () => {
		const home = await allowancesHome()
		const body = bodyOf(await allowances(home, [...planFlags(), "--budget", "50000"]))
		const rows = body.allowances.filter((row) => row.from === "2026-01-01")
		// 50,000 in all for the year: RMF takes five steps and ThaiESG none.
		expect(rows.map((row) => [row.label, row.extra, row.stoppedBy])).toEqual([
			[RMF, "50000.00", "budget"],
			[ESG, "0.00", "budget"],
		])
		expect(rows[1]?.flow).toBeUndefined()
		expect(body.budget).toBe("50000.00")
	})

	it("takes only steps that save --min-saving percent of themselves, converted to basis points", async () => {
		const home = await allowancesHome()
		// The 2026 steps save 15% in the top band and 10% below it, so 12.5% stops RMF once taxable
		// income is under 500,000: 506,000 -> 500,000 is 6,000 at 15% and 4,000 at 10% (1,300, 13%),
		// the next step saves 1,000, 10% of itself, and is not taken.
		const body = bodyOf(await allowances(home, [...planFlags(), "--min-saving", "12.5"]))
		expect(body.minSavingBps).toBe(1250)
		const rmf = body.allowances.find((row) => row.from === "2026-01-01" && row.label === RMF)
		expect(rmf).toMatchObject({ extra: "10000.00", stoppedBy: "belowMinSaving" })
	})

	it("dates a suggestion on the As-of when the year's 15th is already behind it", async () => {
		const home = await allowancesHome()
		// A year the As-of starts inside needs the caller's Carry-in: 720,000 of salary so far.
		const carryIn = carryInFile(home, [
			thRecord({
				scenario: "plan",
				tallies: [
					{ label: "income.section40_1", basis: "gross", amount: "720000.00" },
					{ label: RMF, basis: "funded", amount: "0.00" },
				],
			}),
		])
		const flags = withFlag("--as-of", "2026-12-20")
		const body = bodyOf(await allowances(home, [...flags, "--labels", RMF, "--carry-in", carryIn]))
		const rmf = body.allowances.find((row) => row.from === "2026-01-01")
		expect(rmf?.flow?.start).toBe("2026-12-20")
		expect(rmf?.flow?.id).toBe("rmf-fund-rmf-2026")
	})

	it("leaves a year the Projection ends inside out, with a note", async () => {
		const home = await allowancesHome()
		const body = bodyOf(await allowances(home, withFlag("--horizon", "2027-06-30")))
		expect(body.taxYears.map((year) => year.from)).toEqual(["2026-01-01"])
		expect(body.notes).toContain(
			"The tax year 2027-01-01 to 2027-12-31 is left out: the Projection ends on 2027-06-30, before the year does.",
		)
	})

	it("says no whole year is left when the Projection ends inside the first", async () => {
		const home = await allowancesHome()
		const body = bodyOf(await allowances(home, withFlag("--horizon", "2026-06-30")))
		expect(body.taxYears).toEqual([])
		expect(body.allowances).toEqual([])
		expect(body.notes.some((note) => note.startsWith("No whole tax year is left"))).toBe(true)
	})
})
