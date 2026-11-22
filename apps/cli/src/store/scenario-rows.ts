import type { AppError } from "../errors"
import { scenarioDocumentError } from "../scenario/document"
import { type ResolvedAnchors, resolveHousehold } from "../scenario/household/resolve"
import { canonicalJson, contentHash } from "./canonical"
import { SCENARIO_COLUMNS } from "./columns"
import type { Ctx } from "./context"
import { abort, guard } from "./guard"
import { iso, newId } from "./ids"
import type { ScenarioRow } from "./types"

export function liveScenario(ctx: Ctx, column: "id" | "name", value: string): ScenarioRow | null {
	return ctx.db
		.query<ScenarioRow, [string, string]>(
			`SELECT ${SCENARIO_COLUMNS} FROM scenario
			WHERE entity_id = ?1 AND ${column} = ?2 AND deleted_at IS NULL`,
		)
		.get(ctx.entityId, value)
}

/**
 * The document as canonical text. `sim-core`'s `check()` decides whether it is a Scenario
 * (ADR-0024). Must run inside `guard`.
 */
export function canonicalDocument(document: unknown, path = "document"): string {
	const failure = scenarioDocumentError(document, path)
	if (failure !== null) return abort(failure)
	return canonicalJson(document, path)
}

/**
 * The scenario document's canonical text, validated exactly as `saveScenario` validates it, or
 * `invalid_input` pointing under `path`.
 */
export function canonicalScenarioDocument(document: unknown, path?: string): string | AppError {
	return guard(() => canonicalDocument(document, path))
}

/**
 * The household a Scenario keeps, resolved onto an incoming document before it is checked (cli
 * ADR-0048). A Scenario with no household passes its document through unchanged.
 */
export function anchorsFor(
	stored: ScenarioRow | null,
	document: unknown,
	owner: string,
): ResolvedAnchors | AppError {
	if (stored?.household == null) return { document, household: null, dropped: [] }
	return resolveHousehold(stored.household, document, owner)
}

export type ScenarioDraft = {
	name: string
	document: string
	forkedFrom: string | null
	household: string | null
}

export function insertScenario(ctx: Ctx, draft: ScenarioDraft): ScenarioRow {
	const at = ctx.clock()
	const id = newId(at)
	ctx.db.run(
		`INSERT INTO scenario (id, entity_id, name, document, content_hash, forked_from, household,
		version, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?8)`,
		[
			id,
			ctx.entityId,
			draft.name,
			draft.document,
			contentHash(draft.document),
			draft.forkedFrom,
			draft.household,
			iso(at),
		],
	)
	return liveScenario(ctx, "id", id)!
}

/** Replaces a live Scenario's document and household; both are canonical text, household or null. */
export function replaceScenario(
	ctx: Ctx,
	current: ScenarioRow,
	document: string,
	household: string | null,
): ScenarioRow {
	ctx.db.run(
		`UPDATE scenario SET document = ?2, content_hash = ?3, household = ?4,
		version = version + 1, updated_at = ?5 WHERE id = ?1`,
		[current.id, document, contentHash(document), household, iso(ctx.clock())],
	)
	return liveScenario(ctx, "id", current.id)!
}
