import type { ProjectionChance } from "../../contract"
import { formatShare, trimPercent } from "../../format"
import { chanceLasts } from "../chance/words"

/** The chance of success with and without the what-if: two values, with no difference between them. */
export interface ChanceTriple {
	/** The what-if's chance, such as "81%". */
	readonly whatIf: string
	/** The baseline's share, or null when the Snapshot holds no chance read for the plan. */
	readonly baseline: string | null
	/** "from 72% to 81%", or the what-if share alone when there is no baseline. */
	readonly sentence: string
	readonly whatIfPaths: number
	readonly succeeded: number
	/** "Lasts to 2028 in 174 of 200 markets." */
	readonly lasts: string
}

/** The what-if's chance beside the baseline's. The CLI states no change here, so none is shown. */
export function chanceTriple(
	whatIf: ProjectionChance,
	baseline: ProjectionChance | null,
): ChanceTriple {
	const share = trimPercent(formatShare(whatIf.successBps))
	const before = baseline === null ? null : trimPercent(formatShare(baseline.successBps))
	return {
		whatIf: share,
		baseline: before,
		sentence: before === null ? share : `from ${before} to ${share}`,
		whatIfPaths: whatIf.paths,
		succeeded: whatIf.succeeded,
		lasts: chanceLasts(whatIf.succeeded, whatIf.paths, whatIf.horizon),
	}
}
