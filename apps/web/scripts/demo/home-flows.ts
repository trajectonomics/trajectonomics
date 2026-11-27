/** One measure reading the condo's value, and one taking a share of it. */
const SHARE = (num: number, den: number) => ({
	measures: [
		{ id: "value", op: "account", account: "condo" },
		{ id: "share", op: "scale", of: "value", num, den, rounding: "halfUp" },
	],
	result: "share",
})

/** No growth: a once amount that does not follow inflation. */
const NONE = { bps: 0 }

const WHOLE = { measures: [{ id: "value", op: "account", account: "condo" }], result: "value" }

/**
 * The condo's Flows: bought and borrowed on 15 July 2027, run and let for ten years, sold and its loan repaid on
 * 15 July 2037. `apply.ts` adds them after the plan's own, and the Accounts they name are `HOME_ACCOUNTS`.
 */
export const HOME_FLOWS: readonly Record<string, unknown>[] = [
	{
		id: "condo-purchase",
		displayLabel: "Condo purchase",
		kind: "contribution",
		target: "condo",
		funding: "obligation",
		frequency: "once",
		start: "2027-07-15",
		amount: 120_000_000,
		growth: NONE,
	},
	{
		id: "condo-buying-cost",
		displayLabel: "Condo buying costs",
		kind: "expense",
		frequency: "once",
		start: "2027-07-15",
		amount: 2_000_000,
		growth: NONE,
	},
	{
		id: "condo-loan-draw",
		displayLabel: "Condo loan",
		kind: "withdrawal",
		source: "condo-loan",
		frequency: "once",
		start: "2027-07-15",
		amount: 96_000_000,
		growth: NONE,
	},
	{
		id: "condo-loan-payment",
		displayLabel: "Condo loan payment",
		kind: "contribution",
		target: "condo-loan",
		frequency: "monthly",
		start: "2027-08-15",
		end: "2037-07-14",
		level: { principal: 96_000_000, payments: 240, rounding: "ceil" },
	},
	{
		id: "condo-running",
		displayLabel: "Condo running costs",
		kind: "expense",
		category: "housing",
		frequency: "monthly",
		start: "2027-08-15",
		end: "2037-07-14",
		derive: SHARE(100, 120_000),
	},
	{
		id: "condo-rent",
		displayLabel: "Condo rent",
		kind: "income",
		earned: false,
		frequency: "monthly",
		start: "2027-08-15",
		end: "2037-07-14",
		amount: 700_000,
		growth: "inflation",
	},
	{
		id: "condo-sale",
		displayLabel: "Condo sale",
		kind: "withdrawal",
		source: "condo",
		frequency: "once",
		start: "2037-07-15",
		derive: WHOLE,
	},
	{
		id: "condo-selling-cost",
		displayLabel: "Condo selling costs",
		kind: "expense",
		frequency: "once",
		start: "2037-07-15",
		derive: SHARE(300, 10_000),
	},
	{
		id: "condo-loan-payoff",
		displayLabel: "Condo loan payoff",
		kind: "contribution",
		target: "condo-loan",
		frequency: "once",
		start: "2037-07-15",
		derive: WHOLE,
	},
]
