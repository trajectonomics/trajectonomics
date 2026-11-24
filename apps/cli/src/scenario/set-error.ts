import type { AppError } from "../errors"
import { formatPath } from "./path"
import { flagError, type OverrideFlag } from "./set-parse"
import { closeEnough, knownPaths, nearest } from "./set-suggest"

export type AppliedOverride = { path: string; value: unknown }

export type SegmentContext = {
	index: number
	path: string
	segments: readonly string[]
	/** The input field a refusal names; a `--set` when omitted. */
	flag?: OverrideFlag
}

function flagOf(ctx: SegmentContext): OverrideFlag {
	return ctx.flag ?? "set"
}

/** The first segment that cannot be followed, with the nearest path or the known siblings. */
export function unknownSegment(
	candidates: readonly string[],
	segment: string,
	rest: number,
	prefix: readonly string[],
	ctx: SegmentContext,
): AppError {
	const closest = nearest(segment, candidates)
	const suggestion =
		closest !== null && closeEnough(closest)
			? formatPath([...prefix, closest.candidate, ...ctx.segments.slice(rest)])
			: null
	const where = prefix.length === 0 ? "the document" : `"${formatPath(prefix)}"`
	const hint =
		suggestion !== null
			? `Did you mean "${suggestion}"?`
			: candidates.length === 0
				? `There is no key or id under ${where}.`
				: knownPaths(candidates)
	return flagError(flagOf(ctx), ctx.index, `no key or id "${segment}" under ${where}`, {
		hint,
		details: { index: ctx.index, path: ctx.path, segment, suggestion },
	})
}

export function ambiguousSegment(
	segment: string,
	prefix: readonly string[],
	ctx: SegmentContext,
): AppError {
	return flagError(
		flagOf(ctx),
		ctx.index,
		`"${segment}" matches more than one id under "${formatPath(prefix)}"`,
		{
			hint: "Address a list item by an id that appears once.",
			details: { index: ctx.index, path: ctx.path, segment },
		},
	)
}

export function scalarPrefix(prefix: readonly string[], ctx: SegmentContext): AppError {
	const where = prefix.length === 0 ? "the document" : `"${formatPath(prefix)}"`
	return flagError(
		flagOf(ctx),
		ctx.index,
		`${where} is not an object, so it cannot be walked into`,
		{
			hint: `"${formatPath(prefix)}" is a value; set it whole, or choose a path under an object.`,
			details: { index: ctx.index, path: ctx.path, segment: formatPath(prefix), suggestion: null },
		},
	)
}

export function identityFailure(segment: string, ctx: SegmentContext): AppError {
	return flagError(
		flagOf(ctx),
		ctx.index,
		`the item "${segment}" must stay an object with id "${segment}"`,
		{
			hint: "Replacing a list item may change its fields, never its id.",
			details: { index: ctx.index, path: ctx.path, segment },
		},
	)
}

/** A position a routing list does not hold, or a segment that is not a position (cli ADR-0070). */
export function unknownPosition(
	segment: string,
	length: number,
	prefix: readonly string[],
	ctx: SegmentContext,
): AppError {
	const where = `"${formatPath(prefix)}"`
	const held =
		length === 0
			? `${where} holds no entries`
			: `${where} holds ${length} ${length === 1 ? "entry" : "entries"}, numbered 0 to ${length - 1}`
	return flagError(flagOf(ctx), ctx.index, `no entry "${segment}" under ${where}`, {
		hint: `A step or entry of this list is addressed by its position, counted from 0, such as ${formatPath([...prefix, "0"])}; ${held}.`,
		details: { index: ctx.index, path: ctx.path, segment, suggestion: null },
	})
}
