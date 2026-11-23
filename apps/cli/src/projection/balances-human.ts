import { type ColumnHint, tableLines } from "../table/lines"
import { tableRows } from "./cashflow-human"

/*
 * `projection run --accounts`' human view (cli ADR-0060): one table of Accounts by year, a column per
 * Account and a row per roll-up's end, read from the balance rows. It states no figure the rows lack.
 */

/** The result without its balances table: the human form prints the Accounts by year as a block instead. */
export function balancesHidden(data: Record<string, unknown>): Record<string, unknown> {
	const tables = data["tables"]
	if (!Array.isArray(tables)) return data
	return {
		...data,
		tables: tables.filter(
			(entry) => !(typeof entry === "object" && entry !== null && entry["name"] === "balances"),
		),
	}
}

/** The dates the annual table reads its real figure at: the end of each roll-up, as the balances are read. */
function endDatesOf(data: Record<string, unknown>): Set<string> {
	const dates = (tableRows(data, "annual") ?? []).map((row) => {
		const real = row["realNetWorth"]
		return typeof real === "object" && real !== null && "date" in real ? String(real.date) : ""
	})
	return new Set(dates)
}

/** The Accounts of the rows, in the order the engine states them. */
function accountsOf(rows: readonly Record<string, unknown>[]): string[] {
	return [...new Set(rows.map((row) => String(row["account"])))]
}

/** An Account's column key, apart from `date` so an Account named `date` cannot take its place. */
function keyOf(account: unknown): string {
	return `account:${String(account)}`
}

/** One row per date: the date, and each Account's amount under its id. */
function pivotOf(
	rows: readonly Record<string, unknown>[],
	dates: ReadonlySet<string>,
): Record<string, unknown>[] {
	const byDate = new Map<string, Record<string, unknown>>()
	for (const row of rows) {
		const date = String(row["date"])
		if (!dates.has(date)) continue
		const line = byDate.get(date) ?? { date }
		line[keyOf(row["account"])] = row["amount"]
		byDate.set(date, line)
	}
	return [...byDate.values()]
}

/**
 * The Accounts-by-year block, printed after the body when the result carries the balances table.
 * Without `--accounts` the result has none, and this prints nothing.
 */
export function balanceBlocks(data: Record<string, unknown>): string[] {
	const rows = tableRows(data, "balances")
	if (rows === undefined) return []
	const lines = pivotOf(rows, endDatesOf(data))
	const columns: ColumnHint[] = [
		{ key: "date", label: "date" },
		...accountsOf(rows).map(
			(account): ColumnHint => ({ key: keyOf(account), label: account, align: "right" }),
		),
	]
	return [tableLines("accounts", lines.length, lines, columns)]
}
