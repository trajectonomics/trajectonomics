import { type AppError, isAppError } from "../errors"
import type { ScenarioDocument } from "./document"
import { explainRemovalOrder } from "./set-add-order"
import { applyAdditions } from "./set-addition"
import type { OverrideOptions } from "./set-apply"
import type { AppliedOverride } from "./set-error"
import { applyRemovals } from "./set-removal"

/** The `--without` removals, then the `--add` items: the two groups that come before every `--set` (cli ADR-0062). */
export function removeThenAdd(
	document: ScenarioDocument,
	options: OverrideOptions,
):
	| { removals: string[]; added: { document: ScenarioDocument; additions: AppliedOverride[] } }
	| AppError {
	const removed = applyRemovals(document, options.without ?? [])
	if (isAppError(removed)) return explainRemovalOrder(removed, options.add ?? [])
	const added = applyAdditions(
		removed.document,
		options.add ?? [],
		options.decimal === true,
		removed.removals,
	)
	return isAppError(added) ? added : { removals: removed.removals, added }
}
