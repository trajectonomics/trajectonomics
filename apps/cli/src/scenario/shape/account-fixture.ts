/**
 * An asset Account that states every key of a payout and a fee, for the tests that probe the shape.
 * Its payout starts at the `retire` Milestone; the label and the Levy are the ones the tests' documents carry.
 */
export const FULL_FUND: Record<string, unknown> = {
	id: "fund",
	kind: "asset",
	rate: 500,
	payout: {
		bps: 350,
		frequency: "quarterly",
		rounding: "floor",
		start: "2026-01-01",
		end: "2046-01-01",
		startAt: "retire",
		label: "income.section40_1",
		prepayments: [{ levy: "th-2026", bps: 1000 }],
	},
	fee: { bps: 150, rounding: "halfUp" },
}
