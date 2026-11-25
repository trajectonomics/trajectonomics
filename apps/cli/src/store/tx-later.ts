import { balanceHistory } from "@trajectonomics/core/ledger"
import { type AppError, isAppError } from "../errors"
import type { Ctx } from "./context"
import { laterOverflows, type Overflowed, type Step } from "./later-overflow"
import { readLedger } from "./ledger"
import type { TxAdded } from "./types"

/** A row a write appended, at its position in the batch it came from. */
export type Appended = { index: number; added: TxAdded }

type Own = { index: number; date: string; amount: bigint }

/** What each account's rows add to it, by account, and the date and position of each row. */
function movesOf(rows: readonly Appended[]): Map<string, Own[]> {
	const moves = new Map<string, Own[]>()
	for (const { index, added } of rows) {
		const own = new Map<string, bigint>()
		for (const posting of added.postings) {
			own.set(posting.accountId, (own.get(posting.accountId) ?? 0n) + BigInt(posting.amount))
		}
		for (const [account, amount] of own) {
			const list = moves.get(account) ?? []
			list.push({ index, date: added.tx.date, amount })
			moves.set(account, list)
		}
	}
	return moves
}

/** Each account's writes in date order (rows of one date keep their batch order), with running totals. */
function stepsOf(
	rows: readonly Appended[],
	accounts: ReadonlyMap<string, { id: string; name: string }>,
): Step[][] {
	const steps: Step[][] = []
	for (const [id, moves] of movesOf(rows)) {
		const account = accounts.get(id)!
		const ordered = [...moves].sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index)
		let total = 0n
		steps.push(
			ordered.map((move) => {
				total += move.amount
				return { account, date: move.date, total, index: move.index }
			}),
		)
	}
	return steps
}

/**
 * The rows of a write, already appended inside it, that leave a dated Balance of an account they
 * post to, on their date or later, outside the safe range and worse than the Ledger had it. The
 * Ledger is read once, after the rows, and read without them, so the batch's totals are the only
 * thing added to it; a row refused is refused at the amount of the first posting to the account.
 * A duplicate wrote nothing and is not asked about; with no new row the Ledger is not read.
 */
export function laterRefusals(ctx: Ctx, rows: readonly Appended[]): Overflowed[] | AppError {
	const fresh = rows.filter((row) => row.added.status === "added")
	if (fresh.length === 0) return []
	const ledger = readLedger(ctx)
	if (isAppError(ledger)) return ledger
	const written = new Set(fresh.map((row) => row.added.tx.id))
	const history = balanceHistory(
		ledger.transactions.filter((tx) => !written.has(tx.id)),
		ledger.chart,
	)
	const accounts = new Map(ledger.accounts.map((account) => [account.id, account]))
	const byIndex = new Map(fresh.map((row) => [row.index, row.added]))
	const path = (index: number, accountId: string): string => {
		const at = byIndex.get(index)!.postings.findIndex((p) => p.accountId === accountId)
		return `postings.${at}.amount`
	}
	return laterOverflows(history, stepsOf(fresh, accounts), path)
}
