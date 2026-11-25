import { type AppError, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import { scenarioChanged } from "../scenario/errors"
import { contentHash } from "./canonical"
import type { Ctx } from "./context"
import { write } from "./guard"
import { canonicalDocument, liveScenario, replaceScenario } from "./scenario-rows"
import type { HouseholdOptions, HouseholdPlanner, HouseholdSet } from "./scenario-types"

/**
 * Replaces a live Scenario's household and document in one write: `plan` reads the document and
 * says what to store, and an `AppError` rolls the write back (cli ADR-0048).
 */
export function replaceHousehold(
	ctx: Ctx,
	id: string,
	plan: HouseholdPlanner,
	options: HouseholdOptions = {},
): HouseholdSet | AppError {
	return write(
		ctx.db,
		() => {
			const current = liveScenario(ctx, "id", id)
			if (!current) return { status: "not_found" }
			const expected = options.expectedHash
			if (expected !== undefined && current.contentHash !== expected) {
				return scenarioChanged(current.name, expected, current.contentHash)
			}
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
				scenario: replaceScenario(ctx, current, document, {
					household: planned.household,
					tax: current.tax,
				}),
			}
		},
		options,
	)
}
