import type { CashflowLine } from "./cashflow"

type Group = CashflowLine["group"]

/** One line of year zero: its group, id, Account, category and CLI amount. */
const zero = (
	group: Group,
	id: string | null,
	account: string | null,
	category: string | null,
	amount: string,
): CashflowLine => ({
	index: 0,
	from: "2026-10-31",
	to: "2027-10-30",
	group,
	id,
	account,
	category,
	amount,
})

/** One line of year one, the Shortfall year. */
const one = (
	group: Group,
	id: string | null,
	account: string | null,
	category: string | null,
	amount: string,
): CashflowLine => ({
	index: 1,
	from: "2027-10-31",
	to: "2028-10-30",
	group,
	id,
	account,
	category,
	amount,
})

/** Year zero, the figures the CLI prints for a year with a refund, a categorised spend and two Flows into one Account. */
export const YEAR_ZERO_LINES: CashflowLine[] = [
	zero("income", "salary", null, null, "120000.00"),
	zero("prepaid", "national", null, null, "6000.00"),
	zero("settlement", "national", null, null, "-1800.00"),
	zero("expense", "rent", null, "housing", "30000.00"),
	zero("expense", "food", null, "food", "18000.00"),
	zero("expense", "fees", null, null, "1200.00"),
	zero("expense", "car", null, "transport", "1500.00"),
	zero("category", "housing", null, null, "30000.00"),
	zero("category", "food", null, null, "18000.00"),
	zero("category", "transport", null, null, "1500.00"),
	zero("category", null, null, null, "1200.00"),
	zero("contribution", "invest", "acc-invest", null, "36000.00"),
	zero("contribution", "extra", "acc-invest", null, "28800.00"),
	zero("unfunded", "extra", "acc-invest", null, "19200.00"),
	zero("withdrawal", "borrow", "acc-loan", null, "3000.00"),
	zero("drawn", null, "acc-fund", null, "1500.00"),
	zero("surplus", null, "acc-bank", null, "4800.00"),
]

/** Year one is a Shortfall: 1,000.00 of income is 500.00 short of 1,500.00 of spending. */
export const YEAR_ONE_LINES: CashflowLine[] = [
	one("income", "salary", null, null, "1000.00"),
	one("unmet", null, null, null, "500.00"),
	one("expense", "rent", null, "housing", "1500.00"),
	one("category", "housing", null, null, "1500.00"),
]
