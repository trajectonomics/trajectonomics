import { TH_2026_PARAMETERS } from "../parameters"
import { TH_ARRAY_SEGMENT } from "../references/paths"

/** A figure's value in `TH_2026_PARAMETERS`: one number, or one per item of a statutory table. */
export type ThAssumptionValue = number | readonly number[]

/**
 * Purpose: Reads the value a collapsed parameter path names in `TH_2026_PARAMETERS`, so an
 * assumption states the figure the engine used instead of a copy of it.
 * Math: Walks the path; an `[*]` segment maps the rest of the path over every item of the array.
 * Units: As the parameter: baht, days, years or a ratio.
 * Throws: TypeError when the path does not end at a number.
 */
export function parameterValue(path: string): ThAssumptionValue {
	const found = walk(TH_2026_PARAMETERS, path.split("."))
	if (typeof found === "number" || isNumberList(found)) return found
	throw new TypeError(`${path} is not a number or a list of numbers in TH_2026_PARAMETERS`)
}

function walk(node: unknown, segments: readonly string[]): unknown {
	const [head, ...rest] = segments
	if (head === undefined) return node
	const isTable = head.endsWith(TH_ARRAY_SEGMENT)
	const child = (node as Record<string, unknown>)[isTable ? head.slice(0, -3) : head]
	if (!isTable) return walk(child, rest)
	return (child as readonly unknown[]).map((item) => walk(item, rest))
}

function isNumberList(value: unknown): value is readonly number[] {
	return Array.isArray(value) && value.every((item) => typeof item === "number")
}
