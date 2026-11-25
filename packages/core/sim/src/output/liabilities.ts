import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { EngineSnapshot } from "../engine/snapshot"
import { isTransferTarget } from "../loan/resolve"
import type { AccountId, Baseline, DateString, Scenario, Timeline } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LiabilityMonth, LiabilityStatement } from "../types/statement"
import type { Moves } from "./liability-moves"
import { monthRow, movesOf } from "./liability-moves"
import { type StatementMonth, statementMonths } from "./statement-months"

/** The statements of one run, one per liability in Scenario order, or the problem that stopped them. */
export interface LiabilityOutcome {
	readonly statements?: readonly LiabilityStatement[]
	readonly problem?: ProjectionProblem
}

/** The month rows of one liability; `interest` is the residual, so the identity holds exactly. */
function monthsOf(
	id: AccountId,
	opening: bigint,
	months: readonly StatementMonth[],
	snapshots: ReadonlyMap<DateString, EngineSnapshot>,
	moves: Moves,
	listed: boolean,
): { readonly months: LiabilityMonth[]; readonly problem?: ProjectionProblem } {
	const rows: LiabilityMonth[] = []
	let before = opening
	for (const [index, statementMonth] of months.entries()) {
		const closing = snapshots
			.get(statementMonth.to)!
			.balances.find((item) => item.account === id)!.amount
		const drawn = moves.drawn[index]!
		const paid = moves.paid[index]!
		const transferred = moves.transferred[index]!
		const interest = closing - before - drawn + paid + transferred
		const figures = { before, drawn, paid, transferred, interest, closing }
		for (const value of Object.values(figures)) {
			if (!isSafeInteger(value)) return { months: rows, problem: overflow(statementMonth.to, id) }
		}
		rows.push(monthRow(statementMonth, figures, listed))
		before = closing
	}
	return { months: rows }
}

/** One statement per liability in Scenario order, cut by the Timeline and by a run-out date. */
export function buildLiabilities(
	run: EngineRun,
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
): LiabilityOutcome {
	const end = run.runsOut?.date ?? timeline.horizon
	const months = statementMonths(timeline.start, end, run.runsOut?.date)
	const snapshots = new Map(run.snapshots.map((snapshot) => [snapshot.date, snapshot] as const))
	const statements: LiabilityStatement[] = []
	for (const account of scenario.accounts) {
		if (account.kind !== "liability") continue
		const opened = baseline.balances.find((item) => item.account === account.id)
		const moves = movesOf(run.totals, months, account.id)
		const listed = isTransferTarget(scenario, account.id)
		const built = monthsOf(
			account.id,
			BigInt(opened?.amount ?? 0),
			months,
			snapshots,
			moves,
			listed,
		)
		if (built.problem !== undefined) return { problem: built.problem }
		const paidOff = run.paidOff?.get(account.id)
		statements.push({
			account: account.id,
			months: built.months,
			...(paidOff === undefined ? {} : { paidOff }),
		})
	}
	return { statements }
}
