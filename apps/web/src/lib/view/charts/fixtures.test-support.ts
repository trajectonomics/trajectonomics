import type { ProjectionRun } from "../../contract"
import { ANNUAL_ROWS, projectionRunFixture } from "../projection/fixtures.test-support"

/** A run with tax, an Account's values and a salary line in its cash flow: what a plan with tax states. */
export function withTax(): ProjectionRun {
	return projectionRunFixture({
		taxYears: [
			{
				levy: "th-pit",
				from: "2026-01-01",
				to: "2026-12-31",
				settlementDate: "2027-03-31",
				due: "9000.00",
				prepaid: "0.00",
				owed: "9000.00",
				settled: true,
				partial: false,
				taxableIncome: "100000.00",
				assumptions: [],
			},
			{
				levy: "th-pit",
				from: "2027-01-01",
				to: "2027-12-31",
				settlementDate: "2028-03-31",
				due: "9500.00",
				prepaid: "0.00",
				owed: "9500.00",
				settled: true,
				partial: false,
				assumptions: [],
			},
		],
		tables: [
			{ name: "annual", count: ANNUAL_ROWS.length, rows: [...ANNUAL_ROWS] },
			{
				name: "balances",
				count: 2,
				rows: [
					{ date: "2027-10-30", account: "savings", amount: "500000.00", real: "480000.00" },
					{ date: "2028-10-30", account: "savings", amount: "600000.00", real: "560000.00" },
				],
			},
			{
				name: "cashflow",
				count: 2,
				rows: [
					{
						index: 0,
						from: "2026-10-31",
						to: "2027-10-30",
						group: "income",
						id: "salary",
						account: null,
						category: null,
						amount: "120000.00",
					},
					{
						index: 1,
						from: "2027-10-31",
						to: "2028-10-30",
						group: "income",
						id: "salary",
						account: null,
						category: null,
						amount: "125000.00",
					},
				],
			},
		],
	})
}

/** A run with none of that: the plan's annual roll-ups only. */
export function plain(): ProjectionRun {
	return projectionRunFixture()
}
