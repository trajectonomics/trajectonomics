import { describe, expect, it } from "bun:test"
import {
	allowances,
	allowancesHome,
	bodyOf,
	ESG,
	planFlags,
	RMF,
} from "./projection-allowances-support"

/** A decimal string's minor units, for the one place a test adds: the identity the engine states. */
const minor = (text: string): bigint => BigInt(text.replace(".", ""))

describe("projection allowances on the taxed plan", () => {
	it("fills RMF to its cap in whole steps, then ThaiESG, and the year's saving is the labels' sum", async () => {
		const body = bodyOf(await allowances(await allowancesHome(), planFlags()))
		expect(
			body.taxYears.map((year) => [year.from, year.dueBefore, year.dueAfter, year.saving]),
		).toEqual([
			// 2026: 9 months of 80,000 = 720,000, less 100,000 expenses, 60,000 personal and the
			// 54,000 planned (RMF 45,000, ThaiESG 9,000) is 506,000 taxable: 7,500 + 20,000 + 900.
			// RMF takes 170,000 more (cap 30% of 720,000 = 216,000), leaving 336,000 taxable: 11,100.
			// ThaiESG takes 180,000: the next step would take taxable income from 156,000 to 146,000,
			// past the 150,000 untaxed band's edge, where its last baht saves nothing, so it is dropped.
			["2026-01-01", "28400.00", "300.00", "28100.00"],
			// 2027: the salary rises 2.5% in April, so income is 978,000; RMF cap 293,400, ThaiESG's
			// room 281,400. 746,000 taxable owes 64,400; RMF -230,000 gives 29,900; ThaiESG -280,000 gives 4,300.
			["2027-01-01", "64400.00", "4300.00", "60100.00"],
		])
		for (const year of body.taxYears) {
			const rows = body.allowances.filter((row) => row.from === year.from)
			const total = rows.reduce((sum, row) => sum + minor(row.saving), 0n)
			expect(minor(year.dueBefore) - minor(year.dueAfter)).toBe(total)
			expect(minor(year.saving)).toBe(total)
		}
	})

	it("states, per label, what the plan funds, what more fits, why it stopped and the Flow that applies it", async () => {
		const body = bodyOf(await allowances(await allowancesHome(), planFlags()))
		const rmf = body.allowances.find((row) => row.from === "2026-01-01" && row.label === RMF)
		// 5,000 a month from April is 45,000 planned; the cap is 30% of 720,000 = 216,000, so 170,000 more.
		expect(rmf).toMatchObject({
			planned: "45000.00",
			extra: "170000.00",
			saving: "17300.00",
			stoppedBy: "noSaving",
		})
		expect(rmf?.flow).toEqual({
			id: "rmf-fund-rmf-2026",
			kind: "contribution",
			funding: "obligation",
			frequency: "once",
			label: RMF,
			amount: "170000.00",
			growth: { bps: 0 },
			start: "2026-12-15",
			target: "rmf-fund",
		})
		const esg = body.allowances.find((row) => row.from === "2027-01-01" && row.label === ESG)
		expect(esg?.flow?.id).toBe("esg-fund-thai-esg-2027")
		expect(esg?.flow?.start).toBe("2027-12-15")
	})
})
