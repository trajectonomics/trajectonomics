import type { ProjectionChance } from "../../contract"
import { formatDate, formatShare } from "../../format"

/** The chance of success with and without the what-if: two values, with no difference between them. */
export interface ChanceTriple {
	/** The what-if's success share, such as "81.00%". */
	readonly whatIf: string
	/** The baseline's share, or null when the Snapshot holds no chance read for the plan. */
	readonly baseline: string | null
	/** "from 72.00% to 81.00%", or the what-if share alone when there is no baseline. */
	readonly sentence: string
	readonly whatIfPaths: number
	readonly succeeded: number
	readonly horizon: string
}

/** The what-if's success share beside the baseline's. The CLI states no change here, so none is shown. */
export function chanceTriple(
	whatIf: ProjectionChance,
	baseline: ProjectionChance | null,
): ChanceTriple {
	const share = formatShare(whatIf.successBps)
	const before = baseline === null ? null : formatShare(baseline.successBps)
	return {
		whatIf: share,
		baseline: before,
		sentence: before === null ? share : `from ${before} to ${share}`,
		whatIfPaths: whatIf.paths,
		succeeded: whatIf.succeeded,
		horizon: formatDate(whatIf.horizon),
	}
}
