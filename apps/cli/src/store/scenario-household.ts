import { type AppError, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import { contentHash } from "./canonical"
import type { Ctx } from "./context"
import { write } from "./guard"
import { canonicalDocument, liveScenario, replaceScenario } from "./scenario-rows"
import type { HouseholdPlanner, HouseholdSet } from "./scenario-types"
import type { WriteOptions } from "./types"

/**
 * Replaces a live Scenario's household and document in one write: `plan` reads the document and
 * says what to store, and an `AppError` rolls the write back (cli ADR-0048).
 */
export function replaceHousehold(
	ctx: Ctx,
	id: string,
	plan: HouseholdPlanner,
	options: WriteOptions = {},
): HouseholdSet | AppError {
	return write(
		ctx.db,
		() => {
			const current = liveScenario(ctx, "id", id)
			if (!current) return { status: "not_found" }
			const planned = plan(JSON.parse(current.document) as ScenarioDocument)
			if (isAppError(planned)) return planned
			const document = canonicalDocument(planned.document)
			if (
				current.contentHash === contentHash(document) &&
				current.household === planned.household
			) {
				return { status: "unchanged", scenario: current }
			}
			return {
				status: "updated",
				scenario: replaceScenario(ctx, current, document, planned.household),
			}
		},
		options,
	)
}
