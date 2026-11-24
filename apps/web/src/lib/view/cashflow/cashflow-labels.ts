import type { CashflowLine } from "./cashflow"

/** The key of a line, unique in its roll-up, so a band and its table row can name each other. */
export function lineKey(line: CashflowLine): string {
	return JSON.stringify([line.group, line.id, line.account, line.category])
}

const INTO = "|into"

/** The key of the band an employer's line has on the right of the diagram, where it goes on into its account. */
export function intoKey(key: string): string {
	return `${key}${INTO}`
}

/** The key of the line a band stands for: an employer's band on the right is the same line as its band on the left. */
export function rowKeyOf(key: string): string {
	return key.endsWith(INTO) ? key.slice(0, -INTO.length) : key
}

/** Whether a settlement is a refund: its CLI string keeps the minus sign. */
export function isRefund(line: CashflowLine): boolean {
	return line.group === "settlement" && line.amount.startsWith("-")
}

/** The label of a line given its Account's name, by the line's group. */
type Namer = (line: CashflowLine, account: string) => string

const NAMERS: Readonly<Record<CashflowLine["group"], Namer>> = {
	income: (line) => line.id ?? "Income",
	payout: (_line, account) => `Paid out by ${account}`,
	prepaid: (line) => `Prepayment, ${line.id ?? ""}`,
	settlement: (line) => `${isRefund(line) ? "Refund" : "Settlement"}, ${line.id ?? ""}`,
	expense: (line) => line.id ?? "Expense",
	category: (line) => line.id ?? "Uncategorised",
	contribution: (line, account) => `${line.id ?? ""} into ${account}`,
	unfunded: (line, account) => `${line.id ?? ""} not funded into ${account}`,
	employer: (line, account) => `From your employer into ${account} (${line.id ?? ""})`,
	withdrawal: (line, account) => `${line.id ?? ""} from ${account}`,
	drawn: (_line, account) => `Drawn from ${account}`,
	surplus: (_line, account) => `Left over in ${account}`,
	unmet: () => "Unmet",
}

/** A line's label, with the Account's name where the line has one. A null category is named as uncategorised. */
export function lineLabel(line: CashflowLine, accountName: ReadonlyMap<string, string>): string {
	const account = line.account === null ? "" : (accountName.get(line.account) ?? line.account)
	return NAMERS[line.group](line, account)
}
