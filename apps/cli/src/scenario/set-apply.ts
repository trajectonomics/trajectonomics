import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { setValueFromDecimal } from "./decimal-set"
import { type ScenarioDocument, scenarioProblems } from "./document"
import { ownDocumentError } from "./document-error"
import { formatPath } from "./path"
import type { ParsedSet } from "./set-assign"
import { documentFailure, itemsOf } from "./set-document"
import type { AppliedOverride } from "./set-error"
import { removeThenAdd } from "./set-remove-add"
import { replaceAt } from "./set-replace"
import { duplicatePath, parseSets } from "./set-sets"

/**
 * The document a command persists or projects, and the Overrides that produced it: the removals, the
 * additions and the Sets, each in command-line order (ADR-0024, cli ADR-0056, ADR-0062).
 */
export type AppliedOverrides = {
	document: ScenarioDocument
	overrides: AppliedOverride[]
	removals: string[]
	additions: AppliedOverride[]
}

/** The Overrides beside `--set`: the `--without` and `--add` values, and whether money in them is decimal. */
export type OverrideOptions = {
	without?: readonly string[] | undefined
	add?: readonly string[] | undefined
	decimal?: boolean | undefined
}

/** The echo field a result states for the additions: absent when none was made, so a result keeps its bytes (cli ADR-0062). */
export function additionsOf(applied: Pick<AppliedOverrides, "additions">): {
	additions?: AppliedOverride[]
} {
	return applied.additions.length === 0 ? {} : { additions: applied.additions }
}

/** Whether no Override was given at all, so a command has nothing to apply or to blame. */
function noOverride(sets: readonly string[], options: OverrideOptions): boolean {
	return (
		sets.length === 0 && (options.without ?? []).length === 0 && (options.add ?? []).length === 0
	)
}

/** Applies one Set to the document it follows, converting its value first under `--decimal`. */
function applyOne(
	current: ScenarioDocument,
	set: ParsedSet,
	index: number,
	decimal: boolean,
): ScenarioDocument | AppError {
	const path = formatPath(set.segments)
	const value = decimal
		? setValueFromDecimal(current, index, path, set.segments, set.value)
		: set.value
	if (isAppError(value)) return value
	const next = replaceAt(current, 0, [], { index, path, segments: set.segments, value })
	if (isAppError(next)) return next
	if (!isPlainObject(next)) throw new Error("an override replaced the document itself")
	return next as ScenarioDocument
}

/**
 * Applies the `--without` removals, then the `--add` items, then the `--set` Overrides, each in
 * command-line order, as one pure function (ADR-0024, cli ADR-0056, ADR-0062). It never mutates its
 * input: each change copies the nodes on its path. Under `--decimal` the money of a Set or an added item
 * is converted here, and the echo keeps it as given.
 */
export function applyOverrides(
	document: ScenarioDocument,
	sets: readonly string[],
	options: OverrideOptions = {},
): AppliedOverrides | AppError {
	if (noOverride(sets, options)) return { document, overrides: [], removals: [], additions: [] }
	const grouped = removeThenAdd(document, options)
	if (isAppError(grouped)) return grouped
	const { removals, added } = grouped
	const parsed = parseSets(sets)
	if (isAppError(parsed)) return parsed
	const duplicate = duplicatePath(parsed)
	if (duplicate !== null) return duplicate
	let current = added.document
	const overrides: AppliedOverride[] = []
	for (const [index, set] of parsed.entries()) {
		const next = applyOne(current, set, index, options.decimal === true)
		if (isAppError(next)) return next
		current = next
		overrides.push({ path: formatPath(set.segments), value: set.value })
	}
	return { document: current, overrides, removals, additions: added.additions }
}

/**
 * Applies the Overrides and refuses a final document `sim-core` does not accept, reported at the
 * input field at fault. The pre-check lives beside `applyOverrides` so a caller cannot forget it
 * (ADR-0024).
 */
export function applyScenarioSets(
	document: ScenarioDocument,
	sets: readonly string[],
	options: OverrideOptions = {},
): AppliedOverrides | AppError {
	// A plain fork has no Override to blame: the Store's canonicaliser reports a stale row at `document`.
	// A stored plan is read as stored, so the CLI's own rule is stated here, once, for every read (cli ADR-0067).
	if (noOverride(sets, options)) {
		return ownDocumentError(document) ?? { document, overrides: [], removals: [], additions: [] }
	}
	const applied = applyOverrides(document, sets, options)
	if (isAppError(applied)) return applied
	const [first, ...rest] = scenarioProblems(applied.document)
	if (first === undefined) return applied
	return documentFailure(itemsOf(applied), [first, ...rest], applied.document, document)
}
