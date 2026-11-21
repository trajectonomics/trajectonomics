/** The fictional ledger's chart of accounts, and its opening balances. Every name and figure is invented. */
export const DEMO_ACCOUNTS = [
	{ name: "Bank", type: "asset" },
	{ name: "Fund", type: "asset" },
	{ name: "Car Loan", type: "liability" },
	{ name: "Salary", type: "income" },
	{ name: "Living", type: "expense" },
	{ name: "Rent", type: "expense" },
	{ name: "Opening", type: "equity" },
] as const

/** An opening balance: `to` is credited against Opening on the date. A debt is entered as a negative amount. */
export type Opening = { to: string; amount: string; ref: string }

/** The opening balances on 1 November 2024, in THB. */
export const DEMO_OPENING_DATE = "2024-11-01"
export const DEMO_OPENINGS: readonly Opening[] = [
	{ to: "Bank", amount: "150000.00", ref: "demo-open-bank" },
	{ to: "Fund", amount: "300000.00", ref: "demo-open-fund" },
	{ to: "Car Loan", amount: "-400000.00", ref: "demo-open-loan" },
]
