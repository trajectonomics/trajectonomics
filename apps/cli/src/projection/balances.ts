import type { AnnualRollup, ProjectionBalance, ProjectionRow } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import type { BalanceRow, BalancesTable } from "./balances-view"
import { moneyOf } from "./money"
import { rowAtEnd } from "./rows"

/*
 * `projection run --accounts`' rows (cli ADR-0060): the engine's own per-Account balances in the
 * CLI's money, nominal and real. Each figure is the engine's; none is recomputed here.
 */

/**
 * The engine lists a row's balances by Account id, so they are put in the order the Scenario
 * declares its Accounts (cli ADR-0060). The engine states only the Accounts the Scenario declares; the
 * fallback that puts any other after them is a guard, not a case that happens.
 */
function inScenarioOrder(
	balances: readonly ProjectionBalance[],
	order: readonly string[],
): ProjectionBalance[] {
	const place = (balance: ProjectionBalance): number => {
		const at = order.indexOf(balance.account)
		return at < 0 ? order.length : at
	}
	return [...balances].sort((a, b) => place(a) - place(b))
}

/** One row's Accounts, as the engine states them: the nominal balance beside its real one. */
function balanceRowsOf(
	row: ProjectionRow,
	order: readonly string[],
	currency: string,
): BalanceRow[] | AppError {
	const money = moneyOf(currency)
	const out: BalanceRow[] = []
	for (const balance of inScenarioOrder(row.balances, order)) {
		const real = row.realBalances.find((entry) => entry.account === balance.account)
		if (real === undefined) {
			return fail("internal", {
				message: `The engine's row of ${row.date} states no real balance for ${balance.account}.`,
			})
		}
		out.push({
			date: row.date,
			account: balance.account,
			amount: money(balance.amount),
			real: money(real.amount),
		})
	}
	return out
}

/**
 * The balances table, the Accounts in `order`: the row at each roll-up's end, or every monthly row with `monthly`. The end
 * row is the one `realNetWorth` reads, so a roll-up's balances and its real figure share a date, and
 * two roll-ups that end on one row state it once.
 */
export function balancesTableOf(
	rollups: readonly AnnualRollup[],
	rows: readonly ProjectionRow[],
	monthly: boolean,
	order: readonly string[],
	currency: string,
): BalancesTable | AppError {
	const ends: ProjectionRow[] = []
	for (const rollup of rollups) {
		const end = rowAtEnd(rollup, rows)
		if (end === undefined) {
			return fail("internal", {
				message: `The roll-up ending ${rollup.to} has no monthly row on that day or the next.`,
			})
		}
		// A one-day last roll-up ends on the row the one before it ended on: its balances are stated once.
		if (ends.at(-1)?.date !== end.date) ends.push(end)
	}
	const out: BalanceRow[] = []
	for (const row of monthly ? rows : ends) {
		const balances = balanceRowsOf(row, order, currency)
		if (isAppError(balances)) return balances
		out.push(...balances)
	}
	return { name: "balances", count: out.length, rows: out }
}
