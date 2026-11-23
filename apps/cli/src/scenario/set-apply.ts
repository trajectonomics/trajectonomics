import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { setValueFromDecimal } from "./decimal-set"
import { type ScenarioDocument, scenarioProblems } from "./document"
import { formatPath } from "./path"
import { type ParsedSet, parseSet } from "./set-assign"
import { documentFailure, itemsOf } from "./set-document"
import type { AppliedOverride } from "./set-error"
import { badSet } from "./set-parse"
import { applyRemovals } from "./set-removal"
import { replaceAt } from "./set-replace"

/**
 * The document a command persists or projects, and the Overrides that produced it: the removals and
 * the Sets, each in command-line order (ADR-0024, cli ADR-0056).
 */
export type AppliedOverrides = {
	document: ScenarioDocument
	overrides: AppliedOverride[]
	removals: string[]
}

/** The Overrides beside `--set`: the `--without` paths, and whether a `--set` value is decimal. */
export type OverrideOptions = {
	without?: readonly string[] | undefined
	decimal?: boolean | undefined
}

function parseSets(sets: readonly string[]): ParsedSet[] | AppError {
	const parsed: ParsedSet[] = []
	for (const [index, raw] of sets.entries()) {
		const set = parseSet(raw, index)
		if (isAppError(set)) return set
		parsed.push(set)
	}
	return parsed
}

function duplicatePath(parsed: readonly ParsedSet[]): AppError | null {
	const seen = new Set<string>()
	for (const [index, set] of parsed.entries()) {
		const path = formatPath(set.segments)
		if (seen.has(path)) {
			return badSet(index, `the path "${path}" is given twice`, {
				hint: "Each --set path may appear once; later sets already see earlier ones.",
				details: { index, path },
			})
		}
		seen.add(path)
	}
	return null
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
 * Applies the `--without` removals, then the `--set` Overrides, in command-line order, as one pure
 * function (ADR-0024, cli ADR-0056). It never mutates its input: each change copies the nodes on its
 * path. Under `--decimal` a Set's money value is converted here, and the echo keeps it as given.
 */
export function applyOverrides(
	document: ScenarioDocument,
	sets: readonly string[],
	options: OverrideOptions = {},
): AppliedOverrides | AppError {
	const without = options.without ?? []
	if (sets.length === 0 && without.length === 0) {
		return { document, overrides: [], removals: [] }
	}
	const removed = applyRemovals(document, without)
	if (isAppError(removed)) return removed
	const parsed = parseSets(sets)
	if (isAppError(parsed)) return parsed
	const duplicate = duplicatePath(parsed)
	if (duplicate !== null) return duplicate
	let current = removed.document
	const overrides: AppliedOverride[] = []
	for (const [index, set] of parsed.entries()) {
		const next = applyOne(current, set, index, options.decimal === true)
		if (isAppError(next)) return next
		current = next
		overrides.push({ path: formatPath(set.segments), value: set.value })
	}
	return { document: current, overrides, removals: removed.removals }
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
	if (sets.length === 0 && (options.without ?? []).length === 0) {
		return { document, overrides: [], removals: [] }
	}
	const applied = applyOverrides(document, sets, options)
	if (isAppError(applied)) return applied
	const [first, ...rest] = scenarioProblems(applied.document)
	if (first === undefined) return applied
	return documentFailure(itemsOf(applied), [first, ...rest], applied.document)
}
