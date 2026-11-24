import { type AppError, fail, isAppError } from "../errors"
import { scenarioChanged } from "../scenario/errors"
import { contentHash } from "./canonical"
import { liveOnly, SCENARIO_COLUMNS, SCENARIO_ORDER } from "./columns"
import type { Ctx } from "./context"
import { read, write } from "./guard"
import {
	anchorsFor,
	canonicalDocument,
	insertScenario,
	liveScenario,
	replaceScenario,
	taxKept,
} from "./scenario-rows"
import type { NewScenario, ScenarioSaved } from "./scenario-types"
import type { ListOptions, ScenarioRow, ScenarioSort, WriteOptions } from "./types"

/** The live Scenario this id or name names; an id is read first (ADR-0018). */
export function getScenario(ctx: Ctx, idOrName: string): ScenarioRow | null | AppError {
	return read(
		ctx.db,
		() => liveScenario(ctx, "id", idOrName) ?? liveScenario(ctx, "name", idOrName),
	)
}

/**
 * Creates the named scenario, or versions it when the canonical document, its household or its
 * tax profile changed. A Scenario's household anchors resolve onto the incoming document first (cli
 * ADR-0048), and its tax profile is kept while the document keeps the Levy unchanged (cli ADR-0066).
 */
export function saveScenario(
	ctx: Ctx,
	input: NewScenario,
	options: WriteOptions = {},
): ScenarioSaved | AppError {
	if (input.name === "") return fail("invalid_input", { path: "name", message: "name is empty" })
	return write(
		ctx.db,
		() => {
			const current = liveScenario(ctx, "name", input.name)
			const stale = staleRefusal(current, input.name, input.expectedHash)
			if (stale !== undefined) return stale
			const resolved = anchorsFor(current, input.document, input.name)
			if (isAppError(resolved)) return resolved
			const document = canonicalDocument(resolved.document)
			if (!current) {
				const scenario = insertScenario(ctx, {
					name: input.name,
					document,
					forkedFrom: null,
					household: null,
					tax: null,
				})
				return { status: "created", scenario, droppedAnchors: [] }
			}
			const tax = taxKept(current, resolved.document)
			if (
				current.contentHash === contentHash(document) &&
				current.household === resolved.household &&
				current.tax === tax
			) {
				return { status: "unchanged", scenario: current, droppedAnchors: [] }
			}
			const scenario = replaceScenario(ctx, current, document, {
				household: resolved.household,
				tax,
			})
			return { status: "updated", scenario, droppedAnchors: resolved.dropped }
		},
		options,
	)
}

/** The refusal for a write that named a content hash the stored Scenario no longer has (cli ADR-0055). */
function staleRefusal(
	current: ScenarioRow | null,
	name: string,
	expected: string | undefined,
): AppError | undefined {
	if (expected === undefined || current?.contentHash === expected) return undefined
	return scenarioChanged(name, expected, current?.contentHash ?? null)
}

export function listScenarios(
	ctx: Ctx,
	options: ListOptions<ScenarioSort>,
): ScenarioRow[] | AppError {
	return read(ctx.db, () =>
		ctx.db
			.query<ScenarioRow, [string]>(
				`SELECT ${SCENARIO_COLUMNS} FROM scenario WHERE entity_id = ?1
				${liveOnly(options.includeDeleted)} ORDER BY ${SCENARIO_ORDER[options.sort]}`,
			)
			.all(ctx.entityId),
	)
}
