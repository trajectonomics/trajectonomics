import type { AppError } from "../errors"
import { sentenceFor } from "../projection/refusal-table"
import { documentPath, type ScenarioProblem } from "./document"
import { formatPath, overrideSegments } from "./path"
import type { AppliedOverrides } from "./set-apply"
import { flagError, type OverrideFlag } from "./set-parse"

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

/**
 * The error for a document the overrides left outside `sim-core`'s Scenario schema, at the input
 * field that caused it: a `--without`, an `--add` or a `--set`. It reports the first problem an Override covers,
 * so a later problem cannot hide the one that names the cause; when none covers a problem it reports
 * the first and falls back to the last Override applied.
 */
export function documentFailure(
	items: readonly AppliedItem[],
	problems: readonly [ScenarioProblem, ...ScenarioProblem[]],
	document: unknown,
): AppError {
	const candidates = problems.map((problem) => ({
		problem,
		match: matchingItem(items, problem, document),
	}))
	const chosen = candidates.find((candidate) => candidate.match !== -1) ?? candidates[0]
	if (chosen === undefined) throw new Error("a document failure needs at least one problem")
	const at = chosen.match === -1 ? Math.max(0, items.length - 1) : chosen.match
	const selected = items[at]
	const flag: OverrideFlag = selected?.flag ?? "set"
	// The index counts occurrences of that input field, as its own list does.
	const index = items.slice(0, at).filter((item) => item.flag === flag).length
	const path = documentPath("document", chosen.problem.segments)
	// A code the refusal table words states its sentence and way out, as `scenario apply --file` does.
	const said = sentenceFor({
		code: chosen.problem.code,
		path: ["scenario", ...chosen.problem.segments.map(String)],
	})
	const own = `The overrides leave ${path} invalid; change that value or the path.`
	return flagError(
		flag,
		index,
		`the document is invalid after the overrides: ${path}: ${chosen.problem.code}${said === undefined ? "" : `. ${said.message}`}`,
		{
			hint: said?.hint === undefined ? own : `${said.hint} ${own}`,
			details: {
				index,
				path: selected?.path ?? formatPath(overrideSegments(document, chosen.problem.segments)),
				documentPath: path,
				code: chosen.problem.code,
			},
		},
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
