import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { EngineSnapshot } from "../engine/snapshot"
import type { AccountAmount, AnnualRollup, ProjectionProblem } from "../types/projection"
import type { Declared } from "./declared"
import type { Period } from "./periods"
import { accountFees } from "./rollup-fees"
import { type FlowSums, sumFlows } from "./rollup-sums"

export interface RollupOutcome {
	readonly annual: readonly AnnualRollup[] | undefined
	readonly problem: ProjectionProblem | undefined
}

function unsafe(values: readonly bigint[], date: string): ProjectionProblem | undefined {
	for (const value of values) if (!isSafeInteger(value)) return overflow(date)
	return undefined
}

/**
 * Growth: what net worth gained beyond the money that came in and left. A payout moved, and a fee left
 * outside cashflow (ADR 0028), so each is added back: `interest` is the growth before the fee.
 */
function interestOf(sums: FlowSums, opening: bigint, closing: bigint, unmet: bigint): bigint {
	const gained = closing - opening - sums.income + sums.expense + sums.levy - unmet
	return gained - sums.employer + sums.payouts + sums.fees
}

function rollupOf(
	period: Period,
	sums: FlowSums,
	opening: bigint,
	closing: bigint,
	unmet: bigint,
	declared: Declared & { readonly levy: boolean },
	accountFee: readonly AccountAmount[],
): AnnualRollup {
	const interest = interestOf(sums, opening, closing, unmet)
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
		...(declared.payouts ? { payouts: Number(sums.payouts) } : {}),
		...(declared.fees.length > 0 ? { fees: Number(sums.fees), accountFees: accountFee } : {}),
		unfundedContributions: Number(sums.unfunded),
		...(declared.levy ? { levy: Number(sums.levy) } : {}),
		...(declared.withdrawals ? { withdrawals: Number(sums.withdrawals) } : {}),
		...(declared.transfers ? { transfers: Number(sums.transfers) } : {}),
		interest: Number(interest),
		unmet: Number(unmet),
		partial: period.partial,
	}
}

export function buildRollups(
	run: EngineRun,
	periods: readonly Period[],
	opening: bigint,
	declares: Declared,
): RollupOutcome {
	const snapshots = new Map<string, EngineSnapshot>()
	for (const snapshot of run.snapshots) snapshots.set(snapshot.date, snapshot)
	const annual: AnnualRollup[] = []
	const declared = { ...declares, levy: run.levies !== undefined && run.levies.length > 0 }
	let openingWorth = opening
	for (const period of periods) {
		const sums = sumFlows(run.totals, period)
		const closing = snapshots.get(period.to)!.netWorth
		const unmet = run.runsOut?.date === period.to ? run.runsOut.unmet : 0n
		const interest = interestOf(sums, openingWorth, closing, unmet)
		const problem = unsafe(
			[
				openingWorth,
				closing,
				sums.income,
				sums.expense,
				sums.withdrawals,
				sums.transfers,
				sums.contributions,
				sums.employer,
				sums.payouts,
				sums.fees,
				sums.unfunded,
				sums.levy,
				interest,
				unmet,
			],
			period.to,
		)
		if (problem !== undefined) return { annual: undefined, problem }
		const fees = accountFees(run.totals, period, declares.fees)
		annual.push(rollupOf(period, sums, openingWorth, closing, unmet, declared, fees))
		openingWorth = closing
	}
	return { annual, problem: undefined }
}
