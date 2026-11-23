import type { DayTotals } from "../engine/occurrence"
import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { EngineSnapshot } from "../engine/snapshot"
import type { AccountId, Baseline, DateString, Scenario, Timeline } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { LiabilityMonth, LiabilityStatement } from "../types/statement"
import { type StatementPeriod, statementPeriods } from "./statement-periods"

export interface LiabilityOutcome {
	readonly statements?: readonly LiabilityStatement[]
	readonly problem?: ProjectionProblem
}

interface Moves {
	readonly drawn: readonly bigint[]
	readonly paid: readonly bigint[]
}

/** Sums one liability's borrowing and payments into each period. Totals are in date order. */
function movesOf(
	totals: readonly DayTotals[],
	periods: readonly StatementPeriod[],
	id: AccountId,
): Moves {
	const drawn = periods.map(() => 0n)
	const paid = periods.map(() => 0n)
	let index = 0
	for (const day of totals) {
		while (index < periods.length - 1 && periods[index]!.to < day.date) index++
		drawn[index] = drawn[index]! + (day.drawnBy.get(id) ?? 0n)
		paid[index] = paid[index]! + (day.paidBy.get(id) ?? 0n)
	}
	return { drawn, paid }
}

/** The month rows of one liability; `interest` is the residual, so the identity holds exactly. */
function monthsOf(
	id: AccountId,
	opening: bigint,
	periods: readonly StatementPeriod[],
	snapshots: ReadonlyMap<DateString, EngineSnapshot>,
	moves: Moves,
): { readonly months: LiabilityMonth[]; readonly problem?: ProjectionProblem } {
	const months: LiabilityMonth[] = []
	let before = opening
	for (const [index, period] of periods.entries()) {
		const closing = snapshots.get(period.to)!.balances.find((item) => item.account === id)!.amount
		const drawn = moves.drawn[index]!
		const paid = moves.paid[index]!
		const interest = closing - before - drawn + paid
		for (const value of [before, drawn, paid, interest, closing]) {
			if (!isSafeInteger(value)) return { months, problem: overflow(period.to, id) }
		}
		months.push({
			from: period.from,
			to: period.to,
			opening: Number(before),
			drawn: Number(drawn),
			paid: Number(paid),
			interest: Number(interest),
			closing: Number(closing),
			partial: period.partial,
		})
		before = closing
	}
	return { months }
}

/** One statement per liability in Scenario order, cut by the Timeline and by a run-out date. */
export function buildLiabilities(
	run: EngineRun,
	baseline: Baseline,
	scenario: Scenario,
	timeline: Timeline,
): LiabilityOutcome {
	const end = run.runsOut?.date ?? timeline.horizon
	const periods = statementPeriods(timeline.start, end, run.runsOut?.date)
	const snapshots = new Map(run.snapshots.map((snapshot) => [snapshot.date, snapshot] as const))
	const statements: LiabilityStatement[] = []
	for (const account of scenario.accounts) {
		if (account.kind !== "liability") continue
		const opened = baseline.balances.find((item) => item.account === account.id)
		const moves = movesOf(run.totals, periods, account.id)
		const built = monthsOf(account.id, BigInt(opened?.amount ?? 0), periods, snapshots, moves)
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
