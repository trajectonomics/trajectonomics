/**
 * The fictional condo of the Demo plan: a real asset the way the Assets and debts form writes one (cli ADR 0060). It
 * is bought on 15 July 2027 with a loan, let and kept for ten years, and sold on 15 July 2037, when the loan is
 * repaid from the sale. Every figure is invented and in the document's integer minor units; the page states none of
 * them as a default. The dates fall on the 15th, a day the plan's monthly `fund` Contribution is not due.
 */
export const HOME_ACCOUNTS: readonly Record<string, unknown>[] = [
	{ id: "condo", kind: "asset", rate: 250, liquid: false },
	{ id: "condo-loan", kind: "liability", rate: 500, compounding: "monthly" },
]

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

export const HOME_FLOWS: readonly Record<string, unknown>[] = [
	{
		id: "condo-purchase",
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
		kind: "expense",
		frequency: "once",
		start: "2027-07-15",
		amount: 2_000_000,
		growth: NONE,
	},
	{
		id: "condo-loan-draw",
		kind: "withdrawal",
		source: "condo-loan",
		frequency: "once",
		start: "2027-07-15",
		amount: 96_000_000,
		growth: NONE,
	},
	{
		id: "condo-loan-payment",
		kind: "contribution",
		target: "condo-loan",
		frequency: "monthly",
		start: "2027-08-15",
		end: "2037-07-14",
		level: { principal: 96_000_000, payments: 240, rounding: "ceil" },
	},
	{
		id: "condo-running",
		kind: "expense",
		category: "housing",
		frequency: "monthly",
		start: "2027-08-15",
		end: "2037-07-14",
		derive: SHARE(100, 120_000),
	},
	{
		id: "condo-rent",
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
		kind: "withdrawal",
		source: "condo",
		frequency: "once",
		start: "2037-07-15",
		derive: WHOLE,
	},
	{
		id: "condo-selling-cost",
		kind: "expense",
		frequency: "once",
		start: "2037-07-15",
		derive: SHARE(300, 10_000),
	},
	{
		id: "condo-loan-payoff",
		kind: "contribution",
		target: "condo-loan",
		frequency: "once",
		start: "2037-07-15",
		derive: WHOLE,
	},
]
