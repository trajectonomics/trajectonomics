import type { ScenarioDocument } from "../scenario/document"
import type { ResolvedAnchors } from "../scenario/household/resolve"
import { contentHash } from "./canonical"
import type { Ctx } from "./context"
import type { ScenarioRow } from "./rows"
import { insertScenario, replaceScenario, taxKept } from "./scenario-rows"
import type { NewScenario, ScenarioSaved } from "./scenario-types"
import { unstatedFor } from "./scenario-unstated"

/** A create of the name: no household or profile, and the caller's seed for the unstated column. */
export function createdScenario(
	ctx: Ctx,
	input: NewScenario,
	resolved: ResolvedAnchors,
	document: string,
): ScenarioSaved {
	const unstated = unstatedFor(null, resolved.document as ScenarioDocument, input.unstated, [])
	const scenario = insertScenario(ctx, {
		name: input.name,
		document,
		forkedFrom: null,
		household: null,
		tax: null,
		notes: null,
		unstated,
	})
	return { status: "created", scenario, droppedAnchors: [], droppedOwners: [] }
}

/** A save of the current row: unchanged when nothing moved, else a new version (cli ADR-0021). */
export function savedScenario(
	ctx: Ctx,
	current: ScenarioRow,
	input: NewScenario,
	resolved: ResolvedAnchors,
	document: string,
): ScenarioSaved {
	const tax = taxKept(current, resolved.document)
	const unstated = unstatedFor(
		current,
		resolved.document as ScenarioDocument,
		input.unstated,
		input.stated ?? [],
	)
	const same =
		current.contentHash === contentHash(document) &&
		current.household === resolved.household &&
		current.tax === tax &&
		current.unstated === unstated
	if (same) {
		return { status: "unchanged", scenario: current, droppedAnchors: [], droppedOwners: [] }
	}
	const scenario = replaceScenario(ctx, current, document, {
		household: resolved.household,
		tax,
		unstated,
	})
	return {
		status: "updated",
		scenario,
		droppedAnchors: resolved.dropped,
		droppedOwners: resolved.droppedOwners,
	}
}
