import type { Period } from "../output/periods"
import type {
	ChanceBand,
	ChanceOfSuccess,
	ChanceOfSuccessOptions,
	ChanceRunsOut,
} from "../types/chance"
import { bandAt, bandOf } from "./band"
import { milestoneSummaries } from "./milestone-dates"
import { pathOutcomes } from "./outcomes"
import type { PathOutcome } from "./path-outcome"
import { spendingOf } from "./spending"

/** `succeeded × 10000 / paths`, floored, in integer arithmetic. */
function shareBps(succeeded: number, paths: number): number {
	return Number((BigInt(succeeded) * 10000n) / BigInt(paths))
}

function runsOutAt(period: Period, outcomes: readonly PathOutcome[]): ChanceRunsOut {
	const paths = outcomes.filter((outcome) => outcome.runsOutIndex === period.index).length
	return { index: period.index, to: period.to, paths }
}

/** The same Bands in each path's own today's money; absent when the model holds no inflation (ADR 0033). */
function realBandsOf(
	options: ChanceOfSuccessOptions,
	outcomes: readonly PathOutcome[],
	grid: readonly Period[],
): readonly ChanceBand[] | undefined {
	if (options.model.inflation === undefined) return undefined
	return grid.map((period) =>
		bandOf(
			period,
			outcomes.map((outcome) => outcome.realNetWorth![period.index]!),
		),
	)
}

/** The report of one chance, from every Market path's outcome over the roll-up grid. */
export function summarise(
	options: ChanceOfSuccessOptions,
	outcomes: readonly PathOutcome[],
	grid: readonly Period[],
	milestoneIds: readonly string[],
): ChanceOfSuccess {
	const succeeded = outcomes.filter((outcome) => outcome.runsOutIndex === undefined).length
	const spending = spendingOf(outcomes, grid)
	const realBands = realBandsOf(options, outcomes, grid)
	return {
		definition: { modelId: options.model.id, seed: options.seed, paths: options.paths },
		paths: options.paths,
		succeeded,
		successBps: shareBps(succeeded, options.paths),
		bands: grid.map((period) => bandAt(period, outcomes)),
		...(realBands === undefined ? {} : { realBands }),
		runsOut: grid.map((period) => runsOutAt(period, outcomes)),
		...(spending === undefined ? {} : { spending }),
		...(options.milestoneDates === true
			? { milestones: milestoneSummaries(milestoneIds, outcomes) }
			: {}),
		...(options.outcomes === true
			? { outcomes: pathOutcomes(outcomes, options.milestoneDates === true) }
			: {}),
	}
}
