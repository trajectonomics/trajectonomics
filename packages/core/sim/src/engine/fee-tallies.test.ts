import { describe, expect, it } from "bun:test"
import type { Levy } from "../types"
import { withdrawal } from "./test-assets"
import { chargingSetup, fund } from "./test-fee"
import { emptyCarryIn, periodFrom, withCarryIn } from "./test-helpers"
import { projected } from "./test-payout"

/** 15% of gains and returns, settled on 31 March: what a fee must leave alone. */
const tax: Levy = withCarryIn(
	{
		id: "tax",
		period: { month: 1, day: 1 },
		settlement: { month: 3, day: 31 },
		measures: [
			{ id: "gains", op: "tally", label: "gain", basis: "gains" },
			{ id: "growth", op: "tally", label: "growth", basis: "returns" },
			{ id: "other", op: "add", a: "gains", b: "growth" },
			{ id: "due", op: "scale", of: "other", num: 1500, den: 10_000, rounding: "halfUp" },
		],
		due: "due",
	},
	emptyCarryIn("2025-01-01"),
)

const measure = (id: string, measures: readonly { id: string; value: number }[]) =>
	measures.find((item) => item.id === id)?.value

describe("a fee and the other Tallies", () => {
	it("takes no Cost basis: a later sale sells against the whole basis", () => {
		// 997,501,562 is left on 15 Mar after the 31 Jan and 28 Feb fees. Selling 100,000,000 of it takes
		// 500,000,000 x 100,000,000 / 997,501,562 = 50,125,234.8 of the basis, so the gain is 49,874,765.
		// Without the fee the same sale takes 50,000,000 and realises 50,000,000.
		const sale = withdrawal("sale", "fund", 100_000_000, { start: "2026-03-15" })
		const gain = (account: ReturnType<typeof fund>) => {
			const setup = chargingSetup([account], {
				basis: { fund: 500_000_000 },
				flows: [sale],
				levy: tax,
			})
			return measure("gains", periodFrom(projected(setup), "2026-01-01").measures)
		}
		expect(gain(fund({}, { gainLabel: "gain" }))).toBe(49_874_765)
		expect(gain({ id: "fund", kind: "asset", rate: 0, gainLabel: "gain" })).toBe(50_000_000)
	})

	it("counts growth under returnLabel, never the fee as a loss: 0 at a rate of 0", () => {
		const setup = chargingSetup([fund({}, { returnLabel: "growth" })], { levy: tax })
		expect(measure("growth", periodFrom(projected(setup), "2026-01-01").measures)).toBe(0)
	})
})
