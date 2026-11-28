import { type AppError, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import { scenarioChanged } from "../scenario/errors"
import { contentHash } from "./canonical"
import type { Ctx } from "./context"
import { write } from "./guard"
import { canonicalDocument, liveScenario, replaceScenario } from "./scenario-rows"
import type { TaxOptions, TaxPlanner, TaxSet } from "./scenario-types"
import { unstatedFor } from "./scenario-unstated"

/**
 * Replaces a live Scenario's tax profile and its document in one write: `plan` reads the document
 * and the profile stored with it and says what to store, and an `AppError` rolls the write back
 * (cli ADR-0066). The read, the hash check and the write are one transaction, so `--merge` changes
 * the profile it read and no other writer can move the plan in between.
 */
export function replaceTax(
	ctx: Ctx,
	id: string,
	plan: TaxPlanner,
	options: TaxOptions = {},
): TaxSet | AppError {
	return write(
		ctx.db,
		() => {
			const current = liveScenario(ctx, "id", id)
			if (!current) return { status: "not_found" }
			const expected = options.expectedHash
			if (expected !== undefined && current.contentHash !== expected) {
				return scenarioChanged(current.name, expected, current.contentHash)
			}
			const planned = plan(
				JSON.parse(current.document) as ScenarioDocument,
				current.tax,
				current.household,
			)
			if (isAppError(planned)) return planned
			const document = canonicalDocument(planned.document)
			const unstated = unstatedFor(current, JSON.parse(document) as ScenarioDocument, null, [])
			if (
				current.contentHash === contentHash(document) &&
				current.tax === planned.tax &&
				current.unstated === unstated
			) {
				return { status: "unchanged", scenario: current }
			}
			return {
				status: "updated",
				scenario: replaceScenario(ctx, current, document, {
					household: current.household,
					tax: planned.tax,
					unstated,
				}),
			}
		},
		options,
	)
}
