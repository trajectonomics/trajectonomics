import { household, withEstate } from "../estate/test-household"
import type { ParityCase } from "./parity-cases"

const withEstateStatement = { estate: true } as const

/**
 * Estate statements (ADR 0025), pinned under every engine: a home, a loan and a locked fund with shares,
 * a growing fixed cost and a gift; gifts larger than the net; and debts above everything owned.
 */
export const ESTATE_PARITY_CASES: readonly ParityCase[] = [
	{
		name: "estate-home-month",
		fixture: withEstate(household(), {
			costs: [
				{ id: "settlement", of: "gross", bps: 200, rounding: "halfUp" },
				{ id: "home-sale", of: { accounts: ["home"] }, bps: 500, rounding: "halfUp" },
				{ id: "lawyer", amount: 100_000, growth: "inflation" },
			],
			gifts: [{ id: "temple", of: "net", bps: 1000, rounding: "floor" }],
		}),
		projectOptions: withEstateStatement,
	},
	{
		name: "estate-gifts-capped",
		fixture: withEstate(household(), {
			costs: [{ id: "settlement", of: "gross", bps: 200, rounding: "halfUp" }],
			gifts: [
				{ id: "charity", amount: 3_000_000, growth: { bps: 0 } },
				{ id: "family", of: "net", bps: 5000, rounding: "halfUp" },
			],
		}),
		projectOptions: withEstateStatement,
	},
	{
		name: "estate-negative-net",
		fixture: withEstate(
			household({ cash: 1_000_000, home: 5_000_000, fund: 2_000_000, loan: 9_000_000 }),
			{
				costs: [{ id: "settlement", of: "gross", bps: 200, rounding: "halfUp" }],
				gifts: [{ id: "temple", of: "net", bps: 1000, rounding: "floor" }],
			},
		),
		projectOptions: withEstateStatement,
	},
]
