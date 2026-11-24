/** The groups of the Record today's values sheet, in the order it lists them. */
export const SHEET_GROUPS = [
	{ key: "cash", title: "Cash" },
	{ key: "investments", title: "Investments" },
	{ key: "property", title: "Property and things" },
	{ key: "other", title: "Other assets" },
	{ key: "debts", title: "Debts" },
] as const

export type GroupKey = (typeof SHEET_GROUPS)[number]["key"]

// The chart of accounts has no kind below "asset", so a group is read from the words of the account's own name
// and of its parents' (the tree the page builds). The first match wins; an asset that matches none is "other".
const INVESTMENT =
	/\b(invest\w*|funds?|stocks?|shares?|etfs?|bonds?|brokerage|retirement|pension|provident|rmf|ssf|thaiesg|crypto\w*|gold)\b/i
const PROPERTY =
	/\b(propert\w*|homes?|houses?|condos?|land|real estate|cars?|vehicles?|motorbikes?|boats?|jewel\w*|art|furniture)\b/i
const CASH =
	/\b(cash|bank|savings?|checking|current|deposits?|wallet|e-?wallet|money market|emergency)\b/i

/**
 * The group of an asset: its own name first, then its parents' names, nearest first. A liability is
 * always a debt, and does not read its name.
 */
export function groupOf(type: "asset" | "liability", names: readonly string[]): GroupKey {
	if (type === "liability") return "debts"
	for (const name of names) {
		if (INVESTMENT.test(name)) return "investments"
		if (PROPERTY.test(name)) return "property"
		if (CASH.test(name)) return "cash"
	}
	return "other"
}
