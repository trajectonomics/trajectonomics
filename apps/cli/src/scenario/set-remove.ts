import { type AppError, isAppError } from "../errors"
import { isPlainObject } from "../json"
import { formatPath } from "./path"
import { isPositionalList } from "./positional"
import { ambiguousSegment, type SegmentContext, scalarPrefix, unknownSegment } from "./set-error"
import { flagError } from "./set-parse"
import { refusedRoutingItem } from "./set-routing-refusal"
import { candidatesAt } from "./set-suggest"

/*
 * `--without <path>` (cli ADR-0056): takes one id-addressed list item out of a Scenario document,
 * transiently for a Projection, persisted by `scenario fork`. The path must end at a list item by its
 * `id`; a key, a whole list or an index is refused, because `--set` is the flag that replaces a value.
 */

/** The `--without` refusal for a path that ends at a value rather than a list item. */
function notAListItem(prefix: readonly string[], segment: string, ctx: SegmentContext): AppError {
	const path = formatPath([...prefix, segment])
	return flagError(
		"without",
		ctx.index,
		`"${path}" is not a list item, so it cannot be taken out`,
		{
			hint: "--without takes a list item by its id, such as --without flows.gym; --set replaces a value.",
			details: { index: ctx.index, path: ctx.path, segment },
		},
	)
}

/** A numeric segment names a position, which a removal never accepts: items are named by id. */
function indexSegment(segment: string, ctx: SegmentContext): AppError {
	return flagError(
		"without",
		ctx.index,
		`"${segment}" is an index, and a list item is named by its id`,
		{
			hint: "Name the list item by its id, such as --without flows.gym; an index is never a path (ADR-0024).",
			details: { index: ctx.index, path: ctx.path, segment },
		},
	)
}

/** Copies the nodes on the way down to one list item and drops it, or refuses at the first miss. */
export function removeAt(
	node: unknown,
	depth: number,
	prefix: readonly string[],
	ctx: SegmentContext,
): unknown | AppError {
	if (Array.isArray(node)) return removeFromList(node, depth, prefix, ctx)
	if (isPlainObject(node)) return removeFromObject(node, depth, prefix, ctx)
	return scalarPrefix(prefix, ctx)
}

function removeFromList(
	node: readonly unknown[],
	depth: number,
	prefix: readonly string[],
	ctx: SegmentContext,
): unknown | AppError {
	const segment = ctx.segments[depth] ?? ""
	if (isPositionalList(prefix)) return refusedRoutingItem(segment, prefix, ctx)
	if (/^[0-9]+$/.test(segment)) return indexSegment(segment, ctx)
	const matches = node.flatMap((item, at) =>
		isPlainObject(item) && item["id"] === segment ? [at] : [],
	)
	const found = matches[0]
	if (found === undefined) {
		return unknownSegment(candidatesAt(node), segment, depth + 1, prefix, ctx)
	}
	if (matches.length > 1) return ambiguousSegment(segment, prefix, ctx)
	if (depth === ctx.segments.length - 1) return node.filter((_item, at) => at !== found)
	const child = removeAt(node[found], depth + 1, [...prefix, segment], ctx)
	if (isAppError(child)) return child
	return node.map((item, at) => (at === found ? child : item))
}

/**
 * The document's lists the core refuses empty but takes absent (sim `check()`: `MISSING_KEY` on `[]`).
 * A removal that empties one drops its key, so switching off a plan's only Milestone or Levy works.
 */
const OPTIONAL_LISTS: ReadonlySet<string> = new Set(["milestones", "levies"])

/** The object with its child replaced, or with the key dropped when an optional list was emptied. */
function withChild(
	node: Record<string, unknown>,
	segment: string,
	child: unknown,
	prefix: readonly string[],
): Record<string, unknown> {
	const emptied = Array.isArray(child) && child.length === 0
	if (prefix.length === 0 && emptied && OPTIONAL_LISTS.has(segment)) {
		return Object.fromEntries(Object.entries(node).filter(([key]) => key !== segment))
	}
	return { ...node, [segment]: child }
}

function removeFromObject(
	node: Record<string, unknown>,
	depth: number,
	prefix: readonly string[],
	ctx: SegmentContext,
): unknown | AppError {
	const segment = ctx.segments[depth] ?? ""
	if (!Object.hasOwn(node, segment)) {
		return unknownSegment(candidatesAt(node), segment, depth + 1, prefix, ctx)
	}
	if (depth === ctx.segments.length - 1) return notAListItem(prefix, segment, ctx)
	const child = removeAt(node[segment], depth + 1, [...prefix, segment], ctx)
	return isAppError(child) ? child : withChild(node, segment, child, prefix)
}
