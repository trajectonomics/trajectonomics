import { describe, expect, it } from "bun:test"
import { oracleGrow } from "../golden/oracle-money"
import type { Levy } from "../types"
import { withdrawal } from "./test-assets"
import { amounts, emptyCarryIn, periodFrom, rowAt, withCarryIn } from "./test-helpers"
import { fund, payingSetup, projected } from "./test-payout"

/** 15% of the gross `dividends` (the gains and returns it tallies add 0), settled on 31 March. */
const tax: Levy = withCarryIn(
	{
		id: "tax",
		period: { month: 1, day: 1 },
		settlement: { month: 3, day: 31 },
		measures: [
			{ id: "gross", op: "tally", label: "dividends", basis: "gross" },
			{ id: "gains", op: "tally", label: "gain", basis: "gains" },
			{ id: "growth", op: "tally", label: "growth", basis: "returns" },
			{ id: "scaled", op: "scale", of: "gross", num: 1500, den: 10_000, rounding: "halfUp" },
			{ id: "other", op: "add", a: "gains", b: "growth" },
			{ id: "none", op: "scale", of: "other", num: 0, den: 1, rounding: "floor" },
			{ id: "due", op: "add", a: "scaled", b: "none" },
		],
		due: "due",
	},
	emptyCarryIn("2025-01-01"),
)

const measure = (id: string, measures: readonly { id: string; value: number }[]) =>
	measures.find((item) => item.id === id)?.value

describe("a payout with a label and a prepayment", () => {
	// Quarterly 10,000,000 + 9,900,000 + 9,801,000 + 9,702,990 = 39,403,990 gross in 2026. 10% is withheld
	// at source: 1,000,000 + 990,000 + 980,100 + 970,299 = 3,940,399. The Levy's due is 15% of the gross,
	// 5,910,598.5, half up 5,910,599, so the Settlement on 31 Mar 2027 is 5,910,599 - 3,940,399 = 1,970,200.
	const setup = payingSetup(
		[fund({ label: "dividends", prepayments: [{ levy: "tax", bps: 1000 }] })],
		{ horizon: "2027-03-31", levy: tax },
	)
	const projection = projected(setup)
	const period = periodFrom(projection, "2026-01-01")

	it("tallies the gross under the label and credits the withholding against the Levy's due", () => {
		expect(measure("gross", period.measures)).toBe(39_403_990)
		expect(period).toMatchObject({ prepaid: 3_940_399, due: 5_910_599, settlement: 1_970_200 })
	})

	it("lands the payout net of the withholding, and the Settlement is the rest of the due", () => {
		expect(amounts(rowAt(projection, "2026-12-31"))["cash"]).toBe(35_463_591)
		// 31 Mar 2027: the fund pays 960,596,010 x 1% = 9,605,960 with 960,596 withheld, and the 1,970,200 settles.
		expect(amounts(rowAt(projection, "2027-03-31"))["cash"]).toBe(42_138_755)
	})
})

describe("a payout and the other Tallies", () => {
	it("tallies no Realised gain and takes no Cost basis: a later sale sells against the whole basis", () => {
		// Basis 800,000,000 stays after four payouts; 100,000,000 sold on 31 Dec off a value of 960,596,010
		// takes 800,000,000 x 100,000,000 / 960,596,010 = 83,281,628 of basis and realises 16,718,372.
		const sale = withdrawal("sale", "fund", 100_000_000, { start: "2026-12-31" })
		const setup = payingSetup([fund({}, { gainLabel: "gain" })], {
			basis: { fund: 800_000_000 },
			flows: [sale],
			levy: tax,
			horizon: "2027-03-31",
		})
		const noSale = payingSetup([fund({}, { gainLabel: "gain" })], {
			basis: { fund: 800_000_000 },
			levy: tax,
			horizon: "2027-03-31",
		})
		expect(measure("gains", periodFrom(projected(noSale), "2026-01-01").measures)).toBe(0)
		expect(measure("gains", periodFrom(projected(setup), "2026-01-01").measures)).toBe(16_718_372)
	})

	it("counts the growth under returnLabel whether it was paid out or not", () => {
		// 364 counted days at 10% from 1 Jan to 31 Dec, then an annual payout of 300 bps on that value.
		const growth = oracleGrow(1_000_000_000n, 1000, 364) - 1_000_000_000n
		const returns = (payout: boolean) => {
			const account = payout
				? fund({ bps: 300, frequency: "annual" }, { rate: 1000, returnLabel: "growth" })
				: ({ id: "fund", kind: "asset", rate: 1000, returnLabel: "growth" } as const)
			const projection = projected(payingSetup([account], { levy: tax, horizon: "2027-03-31" }))
			return measure("growth", periodFrom(projection, "2026-01-01").measures)
		}
		expect(returns(true)).toBe(Number(growth))
		expect(returns(false)).toBe(Number(growth))
	})
})
