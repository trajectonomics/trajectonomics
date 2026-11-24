import type { AppError } from "../errors"
import { scenarioDocumentError } from "../scenario/document"
import { type ResolvedAnchors, resolveHousehold } from "../scenario/household/resolve"
import { taxLevyIn } from "../scenario/tax/holds"
import { canonicalJson, contentHash } from "./canonical"
import type { Ctx } from "./context"
import { abort, guard } from "./guard"
import { iso, newId } from "./ids"
import { liveScenario } from "./scenario-read"
import type { ScenarioRow } from "./types"

export { liveScenario }

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

/**
 * The tax profile a Scenario keeps after a write that did not name one: the stored profile, while
 * the written document holds the Levy `th-2026-pit` exactly as the stored document does (compared
 * as canonical JSON, the form the content hash uses). A Levy that is gone, or one changed by hand
 * or through `--set`, is no longer the one the profile describes, so a later `--merge` or
 * `--from-stored` would silently overwrite the change (cli ADR-0066). A write that leaves the Levy
 * alone, and a tax-year update of the emitter, keep it. Must run inside `guard`.
 */
export function taxKept(stored: ScenarioRow | null, document: unknown): string | null {
	if (stored?.tax == null) return null
	const written = taxLevyIn(document)
	if (written === undefined) return null
	const before = taxLevyIn(JSON.parse(stored.document))
	if (before === undefined) return null
	return canonicalJson(written, "levies") === canonicalJson(before, "levies") ? stored.tax : null
}

export type ScenarioDraft = {
	name: string
	document: string
	forkedFrom: string | null
	household: string | null
	tax: string | null
	notes: string | null
}

export function insertScenario(ctx: Ctx, draft: ScenarioDraft): ScenarioRow {
	const at = ctx.clock()
	const id = newId(at)
	ctx.db.run(
		`INSERT INTO scenario (id, entity_id, name, document, content_hash, forked_from, household,
		tax, notes, version, created_at, updated_at)
		VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?10)`,
		[
			id,
			ctx.entityId,
			draft.name,
			draft.document,
			contentHash(draft.document),
			draft.forkedFrom,
			draft.household,
			draft.tax,
			draft.notes,
			iso(at),
		],
	)
	return liveScenario(ctx, "id", id)!
}

/** What a write leaves beside a Scenario's document: the household and the tax profile, or null. */
export type Siblings = { household: string | null; tax: string | null }

/** Replaces a live Scenario's document and its siblings; every one is canonical text or null. */
export function replaceScenario(
	ctx: Ctx,
	current: ScenarioRow,
	document: string,
	siblings: Siblings,
): ScenarioRow {
	ctx.db.run(
		`UPDATE scenario SET document = ?2, content_hash = ?3, household = ?4, tax = ?5,
		version = version + 1, updated_at = ?6 WHERE id = ?1`,
		[
			current.id,
			document,
			contentHash(document),
			siblings.household,
			siblings.tax,
			iso(ctx.clock()),
		],
	)
	return liveScenario(ctx, "id", current.id)!
}
