import type { AppError } from "../errors"
import type { Ctx } from "./context"
import { write } from "./guard"
import { iso } from "./ids"
import { liveScenario } from "./scenario-rows"
import type { DeleteOptions, ScenarioDeleted } from "./types"

/**
 * Tombstones a scenario: sync can then remove it elsewhere, and its name is free again. The main
 * plan is refused unless `force`, which takes the mark off in the same write (cli ADR-0071).
 */
export function deleteScenario(
	ctx: Ctx,
	id: string,
	options: DeleteOptions = {},
): ScenarioDeleted | AppError {
	return write(
		ctx.db,
		() => {
			const scenario = liveScenario(ctx, "id", id)
			if (!scenario) return { status: "not_found" }
			if (scenario.main && options.force !== true) return { status: "is_main", scenario }
			const at = iso(ctx.clock())
			ctx.db.run(
				`UPDATE scenario SET deleted_at = ?2, main = 0, version = version + 1, updated_at = ?2
				WHERE id = ?1`,
				[id, at],
			)
			return {
				status: "deleted",
				scenario: {
					...scenario,
					main: false,
					version: scenario.version + 1,
					updatedAt: at,
					deletedAt: at,
				},
				wasMain: scenario.main,
			}
		},
		options,
	)
}
