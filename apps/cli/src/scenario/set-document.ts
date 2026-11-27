import type { AppError } from "../errors"
import { decimalAmountHint } from "./decimal-amount-hint"
import { documentPath, type ScenarioProblem } from "./document"
import { ownDocumentError } from "./document-error"
import { isOwnProblem, ownProblems } from "./own-problems"
import { formatPath, overrideSegments } from "./path"
import type { AppliedOverrides } from "./set-apply"
import type { OverrideFlag } from "./set-parse"
import { overrideRefusal } from "./set-refusal"

/**
 * One applied Override, in the order a command applies them: every `--without` removal, then every
 * `--add`, then every `--set` (ADR-0024, cli ADR-0056, ADR-0062). `flag` names the input field the Override came from.
 */
export type AppliedItem = { flag: OverrideFlag; path: string }

/**
 * The applied Override whose path covers a problem: the last in application order when several do,
 * `-1` when none does.
 */
function matchingItem(
	items: readonly AppliedItem[],
	problem: ScenarioProblem,
	document: unknown,
): number {
	const segments = overrideSegments(document, problem.segments)
	const prefixes = new Set(segments.map((_, index) => formatPath(segments.slice(0, index + 1))))
	let found = -1
	for (const [index, item] of items.entries()) {
		if (prefixes.has(item.path)) found = index
	}
	return found
}

/** The refusal for an own problem the stored document already held, or null when it is not one (see `documentFailure`). */
function staleOwnError(
	problem: ScenarioProblem,
	document: unknown,
	stored: unknown,
): AppError | null {
	if (!isOwnProblem(problem)) return null
	const path = problem.segments.join(".")
	const held = ownProblems(stored).some(
		(found) => found.label === problem.label && found.segments.join(".") === path,
	)
	return held ? ownDocumentError(document) : null
}

/**
 * The error for a document the overrides left outside `sim-core`'s Scenario schema, at the input
 * field that caused it: a `--without`, an `--add` or a `--set`. It reports the first problem an Override covers,
 * so a later problem cannot hide the one that names the cause; when none covers a problem it reports
 * the first and falls back to the last Override applied. A problem of the CLI's own that `stored` already held
 * is no Override's doing, so it is stated at the document, as a read states it.
 */
export function documentFailure(
	items: readonly AppliedItem[],
	problems: readonly [ScenarioProblem, ...ScenarioProblem[]],
	document: unknown,
	stored?: unknown,
): AppError {
	const candidates = problems.map((problem) => ({
		problem,
		match: matchingItem(items, problem, document),
	}))
	const chosen = candidates.find((candidate) => candidate.match !== -1) ?? candidates[0]
	if (chosen === undefined) throw new Error("a document failure needs at least one problem")
	// A stale plan's own problem is no Override's doing, so it is stated where it is, as a read states it.
	const stale = chosen.match === -1 ? staleOwnError(chosen.problem, document, stored) : null
	if (stale !== null) return stale
	const at = chosen.match === -1 ? Math.max(0, items.length - 1) : chosen.match
	const selected = items[at]
	const flag: OverrideFlag = selected?.flag ?? "set"
	// The index counts occurrences of that input field, as its own list does.
	const index = items.slice(0, at).filter((item) => item.flag === flag).length
	const path = documentPath("document", chosen.problem.segments)
	const details = {
		index,
		path: selected?.path ?? formatPath(overrideSegments(document, chosen.problem.segments)),
		documentPath: path,
		code: chosen.problem.code,
	}
	return overrideRefusal(
		flag,
		index,
		chosen.problem,
		path,
		details,
		decimalAmountHint(document, chosen.problem),
	)
}

/** The applied Overrides in the order a command applied them: removals, additions, then Sets. */
export function itemsOf(applied: AppliedOverrides): AppliedItem[] {
	return [
		...applied.removals.map((path) => ({ flag: "without" as const, path })),
		...applied.additions.map((addition) => ({ flag: "add" as const, path: addition.path })),
		...applied.overrides.map((override) => ({ flag: "set" as const, path: override.path })),
	]
}
