/**
 * Which field of the estate form a `traj` refusal names. A path comes in two forms: the core's refusals name the line by
 * its index (`document.estate.costs.0.bps`), and the `--decimal` conversion and `--set` name it by its id
 * (`document.estate.costs.settlement.bps`). Both are matched against the lines the save sent (cli ADR 0064).
 */
import type { ErrorBody, EstateBlock } from "../../contract"
import type { Problems, Shown } from "../plan-items/problems"
import { fieldKey, type ListName } from "./draft"

/** The ids of the lines a save sent, in order, per list. */
export interface EstateLayout {
	readonly costs: readonly string[]
	readonly gifts: readonly string[]
}

const NONE: EstateLayout = { costs: [], gifts: [] }

/** The layout of a block as it is saved. */
export function layoutOf(block: EstateBlock | null): EstateLayout {
	return {
		costs: (block?.costs ?? []).map((line) => line.id),
		gifts: (block?.gifts ?? []).map((line) => line.id),
	}
}

const FIELDS: Readonly<Record<string, string>> = {
	id: "name",
	bps: "share",
	rounding: "rounding",
	amount: "amount",
	of: "of",
}

/** The form field of the part of a line's path after its place: the share, the base, the amount, its growth. */
function fieldOf(rest: readonly string[]): string {
	const [field, part] = rest
	if (field === "of") return part === "accounts" ? "accounts" : "of"
	if (field === "growth") return part === "bps" ? "rate" : "growth"
	return (field === undefined ? undefined : FIELDS[field]) ?? "how"
}

/** The position of the line a path segment names: its id first, then its index. */
function placeOf(ids: readonly string[], segment: string): number {
	const byId = ids.indexOf(segment)
	if (byId >= 0) return byId
	return /^\d+$/.test(segment) && Number(segment) < ids.length ? Number(segment) : -1
}

/** The form field a refusal names, as `fieldKey` writes it, or null when it names none. */
export function estateFieldOfRefusal(error: ErrorBody | null, layout: EstateLayout): string | null {
	const segments = error?.path?.split(".") ?? []
	const at = segments.indexOf("estate")
	const list = segments[at + 1]
	const ref = segments[at + 2]
	if (at < 0 || (list !== "costs" && list !== "gifts") || ref === undefined) return null
	const index = placeOf(layout[list as ListName], ref)
	return index < 0 ? null : fieldKey(list, index, fieldOf(segments.slice(at + 3)))
}

/** What the form shows: its own problems, and the CLI's refusal in its own words at the field its path names. */
export function estateShown(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	layout: EstateLayout = NONE,
): Shown {
	const refused = estateFieldOfRefusal(refusal, layout)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
