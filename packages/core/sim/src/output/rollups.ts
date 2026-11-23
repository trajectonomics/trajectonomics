import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { EngineSnapshot } from "../engine/snapshot"
import type { AnnualRollup, ProjectionProblem } from "../types/projection"
import type { Period } from "./periods"
import { type FlowSums, sumFlows } from "./rollup-sums"

export interface RollupOutcome {
	readonly annual: readonly AnnualRollup[] | undefined
	readonly problem: ProjectionProblem | undefined
}

function unsafe(values: readonly bigint[], date: string): ProjectionProblem | undefined {
	for (const value of values) if (!isSafeInteger(value)) return overflow(date)
	return undefined
}

function rollupOf(
	period: Period,
	sums: FlowSums,
	opening: bigint,
	closing: bigint,
	unmet: bigint,
	declared: Declared,
): AnnualRollup {
	const interest =
		closing - opening - sums.income + sums.expense + sums.levy - unmet - sums.employer
	return {
		index: period.index,
		from: period.from,
		to: period.to,
		openingNetWorth: Number(opening),
		closingNetWorth: Number(closing),
		income: Number(sums.income),
		expense: Number(sums.expense),
		contributions: Number(sums.contributions),
		...(declared.employer ? { employerContributions: Number(sums.employer) } : {}),
		unfundedContributions: Number(sums.unfunded),
		...(declared.levy ? { levy: Number(sums.levy) } : {}),
		...(declared.withdrawals ? { withdrawals: Number(sums.withdrawals) } : {}),
		interest: Number(interest),
		unmet: Number(unmet),
		partial: period.partial,
	}
}

/** Optional rollup fields, present only when the Scenario declares the Flow or Levy they report. */
interface Declared {
	readonly levy: boolean
	readonly withdrawals: boolean
	readonly employer: boolean
}

export function buildRollups(
	run: EngineRun,
	periods: readonly Period[],
	opening: bigint,
	withdrawals: boolean,
	employer: boolean,
): RollupOutcome {
	const snapshots = new Map<string, EngineSnapshot>()
	for (const snapshot of run.snapshots) snapshots.set(snapshot.date, snapshot)
	const annual: AnnualRollup[] = []
	const declared: Declared = {
		levy: run.levies !== undefined && run.levies.length > 0,
		withdrawals,
		employer,
	}
	let openingWorth = opening
	for (const period of periods) {
		const sums = sumFlows(run.totals, period)
		const closing = snapshots.get(period.to)!.netWorth
		const unmet = run.runsOut?.date === period.to ? run.runsOut.unmet : 0n
		const interest =
			closing - openingWorth - sums.income + sums.expense + sums.levy - unmet - sums.employer
		const problem = unsafe(
			[
				openingWorth,
				closing,
				sums.income,
				sums.expense,
				sums.withdrawals,
				sums.contributions,
				sums.employer,
				sums.unfunded,
				sums.levy,
				interest,
				unmet,
			],
			period.to,
		)
		if (problem !== undefined) return { annual: undefined, problem }
		annual.push(rollupOf(period, sums, openingWorth, closing, unmet, declared))
		openingWorth = closing
	}
	return { annual, problem: undefined }
}
