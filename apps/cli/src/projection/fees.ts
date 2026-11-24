import type { AnnualRollup } from "@trajectonomics/core/sim"
import type { FeeRow, FeesTable } from "./fees-view"
import { moneyOf } from "./money"

/*
 * The `fees` table (cli ADR-0067): the engine's own per-Account fees of each Annual roll-up in the
 * CLI's money. Nothing is added here: each row is a figure the engine states.
 */

/**
 * What each fee Account was charged in each roll-up, or `undefined` when no Account carries a fee above
 * 0 bps, as the engine states nothing then.
 */
export function feesTableOf(
	rollups: readonly AnnualRollup[],
	currency: string,
): FeesTable | undefined {
	const money = moneyOf(currency)
	const rows: FeeRow[] = rollups.flatMap((rollup) =>
		(rollup.accountFees ?? []).map((fee) => ({
			index: rollup.index,
			from: rollup.from,
			to: rollup.to,
			account: fee.account,
			amount: money(fee.amount),
		})),
	)
	return rows.length === 0 ? undefined : { name: "fees", count: rows.length, rows }
}
