import type { CashflowBreakdown } from "@trajectonomics/core/sim"
import { moneyOf } from "./money"
import type { TransferRow, TransfersTable } from "./transfers-view"

/*
 * `projection run --breakdown`'s `transfers` table (cli ADR-0070): the engine's own transfer lines of each
 * Annual roll-up in the CLI's money. Nothing is added here: each row is a line the engine states.
 */

/** The transfers of every roll-up, or `undefined` when the engine states none (no transfer Flow moved or failed to move anything). */
export function transfersTableOf(
	breakdowns: readonly CashflowBreakdown[],
	currency: string,
): TransfersTable | undefined {
	const money = moneyOf(currency)
	const rows: TransferRow[] = breakdowns.flatMap((breakdown) =>
		(breakdown.transfers ?? []).map((line) => ({
			index: breakdown.index,
			from: breakdown.from,
			to: breakdown.to,
			flow: line.flow,
			source: line.source,
			target: line.target,
			amount: money(line.amount),
			unmoved: money(line.unmoved),
		})),
	)
	return rows.length === 0 ? undefined : { name: "transfers", count: rows.length, rows }
}
