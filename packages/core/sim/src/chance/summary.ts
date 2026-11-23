import type { Period } from "../output/periods"
import type { ChanceOfSuccess, ChanceOfSuccessOptions, ChanceRunsOut } from "../types/chance"
import { bandAt } from "./band"
import type { PathOutcome } from "./path"
import { spendingOf } from "./spending"

/** `succeeded × 10000 / paths`, floored, in integer arithmetic. */
function shareBps(succeeded: number, paths: number): number {
	return Number((BigInt(succeeded) * 10000n) / BigInt(paths))
}

function runsOutAt(period: Period, outcomes: readonly PathOutcome[]): ChanceRunsOut {
	const paths = outcomes.filter((outcome) => outcome.runsOutIndex === period.index).length
	return { index: period.index, to: period.to, paths }
}

/** The report of one chance, from every Market path's outcome over the roll-up grid. */
export function summarise(
	options: ChanceOfSuccessOptions,
	outcomes: readonly PathOutcome[],
	grid: readonly Period[],
): ChanceOfSuccess {
	const succeeded = outcomes.filter((outcome) => outcome.runsOutIndex === undefined).length
	const spending = spendingOf(outcomes, grid)
	return {
		definition: { modelId: options.model.id, seed: options.seed, paths: options.paths },
		paths: options.paths,
		succeeded,
		successBps: shareBps(succeeded, options.paths),
		bands: grid.map((period) => bandAt(period, outcomes)),
		runsOut: grid.map((period) => runsOutAt(period, outcomes)),
		...(spending === undefined ? {} : { spending }),
	}
}
