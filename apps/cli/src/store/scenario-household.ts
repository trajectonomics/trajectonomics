import { type AppError, isAppError } from "../errors"
import type { ScenarioDocument } from "../scenario/document"
import { scenarioChanged } from "../scenario/errors"
import { contentHash, householdHash } from "./canonical"
import type { Ctx } from "./context"
import { write } from "./guard"
import type { ScenarioRow } from "./rows"
import { canonicalDocument, liveScenario, replaceScenario } from "./scenario-rows"
import type { HouseholdOptions, HouseholdPlanner, HouseholdSet } from "./scenario-types"

/**
 * The refusal of a household write whose caller named a householdHash other than the stored one: the
 * hash covers the document and the household, so either moving refuses it (cli ADR-0055).
 */
function changed(current: ScenarioRow, expected: string | undefined): AppError | null {
	if (expected === undefined) return null
	const stored = householdHash(current.document, current.household)
	return stored === expected
		? null
		: scenarioChanged(current.name, expected, stored, "householdHash")
}

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
			const refusal = changed(current, options.expectedHash)
			if (refusal !== null) return refusal
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
