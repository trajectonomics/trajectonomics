import type { Account } from "./account"
import type { BalanceRow } from "./balances"
import { leafBalances, leafSumsOf } from "./balances"
import type { ChartOfAccounts } from "./chart-map"
import { parseISODate } from "./date"
import { scanLedger } from "./ledger-scan"
import type { Total } from "./totals"
import { totalsOf } from "./totals"
import type { Transaction } from "./transaction"

/** Net Worth: the asset and liability Balance rows behind it, and one total per `(Entity, Currency)`. */
export interface NetWorth {
	readonly rows: readonly BalanceRow[]
	readonly totals: readonly Total[]
}

const counted = (account: Account) => account.type === "asset" || account.type === "liability"

const fieldOf = (account: Account) =>
	counted(account) ? `netWorth.rows[${account.id}]` : `netWorth[${account.id}]`

const netWorthOf = (rows: readonly BalanceRow[], chart: ChartOfAccounts): NetWorth => {
	const own = rows.filter((row) => counted(chart.get(row.accountId)!))
	return Object.freeze({
		rows: Object.freeze(own),
		totals: totalsOf(own, 1n, (pair) => `netWorth.totals[${pair}]`),
	})
}

/**
 * Assets minus Liabilities up to and including `asOf`, per `(Entity, Currency)`, positive when
 * assets exceed liabilities. Rows stay raw signed; Equity is not part of it. Raw liabilities are
 * negative, so the natural-sign total is the plain sum of the rows.
 */
export const netWorth = (
	transactions: readonly Transaction[],
	asOf: string,
	chart: ChartOfAccounts,
): NetWorth => {
	return netWorthOf(leafBalances(transactions, asOf, chart, fieldOf), chart)
}

/** Net Worth on any date, from one read of the Ledger. */
export interface NetWorthHistory {
	/** Exactly `netWorth(transactions, asOf, chart)`, its refusals included. */
	readonly at: (asOf: string) => NetWorth
}

/**
 * Reads the Ledger once and answers `netWorth` for any date from that read, so a caller that asks
 * for many dates (every month-end) pays for the scan once rather than once per date. Every answer
 * equals `netWorth(transactions, asOf, chart)`, errors included; a Ledger the scan refuses is
 * refused here, at construction, where `netWorth` refuses it at every date.
 */
export const netWorthHistory = (
	transactions: readonly Transaction[],
	chart: ChartOfAccounts,
): NetWorthHistory => {
	const scanned = scanLedger(transactions, chart)
	return Object.freeze<NetWorthHistory>({
		at: (asOf) => {
			const cutoff = parseISODate(asOf, "asOf")
			return netWorthOf(
				leafSumsOf(scanned, chart, (date) => date <= cutoff, fieldOf),
				chart,
			)
		},
	})
}
