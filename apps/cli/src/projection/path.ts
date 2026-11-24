import { projectPath } from "@trajectonomics/core/sim"
import { type AppError, fail, isAppError } from "../errors"
import type { Placed } from "./carryin-apply"
import { type ModelSource, planModelOf } from "./chance-plan"
import { chanceRefusal } from "./chance-refusal"
import { optionsOf } from "./liabilities"
import type { ProjectionPathView } from "./path-view"
import { routedRun } from "./routing-overflow"
import { runViewOf } from "./run"
import type { Wants } from "./run-tables"

/** The run a path belongs to: the seed and the path count the chance states, and the path's index. */
export type PathSelection = { seed: string; paths: number; index: number }

/**
 * `traj projection path`: the Projection of Market path `index` of the run `--seed`, `--paths` and the
 * Return model define, the one `projection chance --outcomes` lists as `outcomes[index]`. It reports the
 * Projection as `projection run` does and adds the returns the engine drew (cli ADR-0069). The engine
 * refuses an index the run did not draw, and that is `invalid_input` at `--index`.
 */
export function pathOf(
	placed: Placed,
	source: ModelSource,
	selection: PathSelection,
	wants: Wants,
): ProjectionPathView | AppError {
	// The plan after the what-ifs: a `--set` on a volatility changes the model it builds.
	const built = source.kind === "plan" ? planModelOf(placed.document, source.buckets) : undefined
	if (isAppError(built)) return built
	const model = built === undefined && source.kind === "file" ? source.model : built?.model
	if (model === undefined) return fail("internal", { message: "The path has no Return model." })
	const { breakdown, liabilities, spending, estate } = wants
	const options = optionsOf(breakdown, liabilities, spending, estate)
	const { result, notes: unstated } = routedRun(placed.document, placed.timeline, (routing) =>
		projectPath(
			placed.baseline,
			placed.document,
			placed.timeline,
			{ model, ...selection },
			{ ...options, ...routing },
		),
	)
	if (!result.ok) return chanceRefusal(result.problems, selection.paths)
	const { projection } = result
	const view = runViewOf(placed, wants, projection)
	if (isAppError(view)) return view
	return {
		...view,
		notes: [
			...view.notes,
			...unstated,
			`This is path ${selection.index} of ${selection.paths} seeded Market paths, over the return model "${model.id}" with seed ${selection.seed}: the one projection chance --outcomes lists as outcomes[${selection.index}]. The figures are nominal.`,
			...(built?.notes ?? []),
		],
		index: selection.index,
		definition: { modelId: model.id, seed: selection.seed, paths: selection.paths },
		...(built === undefined ? {} : { returnModel: built.view }),
		returns: projection.returns.map((rollup) => ({
			index: rollup.index,
			from: rollup.from,
			to: rollup.to,
			accounts: rollup.accounts.map((entry) => ({
				account: entry.account,
				returnBps: entry.returnBps,
			})),
		})),
	}
}
