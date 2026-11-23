/**
 * The home of the worked example (cli ADR-0060): a real asset is composed of parts the document
 * already has, and `traj` has no model of its own for it. The Accounts are an asset marked `liquid:
 * false` that no routing list names, and a liability that finances it. The Flows buy it (an
 * obligation Contribution, paid in full), borrow against it, repay the loan, carry its running
 * cost and its rent, and sell it. Every figure is a stated example value, in the units of the
 * rest of the example; none is a default, and `traj` ships no rate or share of an asset.
 */
export const HOME_ACCOUNTS: readonly Record<string, unknown>[] = [
	{ id: "home", kind: "asset", rate: 300, liquid: false },
	{ id: "home-loan", kind: "liability", rate: 500, compounding: "monthly" },
]

/** The home's Flows: bought and borrowed on 1 July 2027, run and let for three years, sold on 1 July 2030. */
export const HOME_FLOWS: readonly Record<string, unknown>[] = [
	{
		id: "home-purchase",
		kind: "contribution",
		target: "home",
		funding: "obligation",
		frequency: "once",
		start: "2027-07-01",
		amount: 1_500_000,
		growth: { bps: 0 },
	},
	{
		id: "home-loan-draw",
		kind: "withdrawal",
		source: "home-loan",
		frequency: "once",
		start: "2027-07-01",
		amount: 1_200_000,
		growth: { bps: 0 },
	},
	{
		id: "home-loan-payment",
		kind: "contribution",
		target: "home-loan",
		frequency: "monthly",
		start: "2027-08-01",
		level: { principal: 1_200_000, payments: 180, rounding: "ceil" },
	},
	{
		// One twelfth of 1% of the home's value a month, read before the day's Flows land.
		id: "home-running",
		kind: "expense",
		frequency: "monthly",
		start: "2027-08-01",
		end: "2030-06-01",
		derive: {
			measures: [
				{ id: "value", op: "account", account: "home" },
				{ id: "share", op: "scale", of: "value", num: 1, den: 1200, rounding: "halfUp" },
			],
			result: "share",
		},
	},
	{
		id: "home-rent",
		kind: "income",
		earned: false,
		amount: 8_000,
		frequency: "monthly",
		start: "2027-08-01",
		end: "2030-06-01",
		growth: "inflation",
	},
	{
		// Selling all of it: an amount that reads the Account's value sells the whole asset.
		id: "home-sale",
		kind: "withdrawal",
		source: "home",
		frequency: "once",
		start: "2030-07-01",
		derive: {
			measures: [{ id: "value", op: "account", account: "home" }],
			result: "value",
		},
	},
]
