import { finishLevies } from "../engine/levy-finish"
import { buildLevies } from "../output/levy"
import type { DateString, LevyReport } from "../types"
import type { ProjectionProblem } from "../types/projection"
import type { PrefixPoint } from "./prefix"

export type StoppedLevies =
	| { readonly ok: true; readonly levies: readonly LevyReport[] | undefined }
	| { readonly ok: false; readonly problem: ProjectionProblem }

/**
 * The Levy results of a surviving candidate's whole path: the working months of its prefix, then
 * the months after the stop, read as of `horizon`. `undefined` when the Scenario declares no Levy.
 */
export function stoppedLevies(point: PrefixPoint, horizon: DateString): StoppedLevies {
	if (point.levies === undefined) return { ok: true, levies: undefined }
	const finished = finishLevies(point.levies, point.states, horizon)
	if (!finished.ok) return finished
	const built = buildLevies(finished.levies)
	return built.problem === undefined
		? { ok: true, levies: built.levies }
		: { ok: false, problem: built.problem }
}
