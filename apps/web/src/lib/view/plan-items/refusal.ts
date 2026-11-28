import type { ErrorBody } from "../../contract"
import { localPath, splitPath } from "../document-path"

export { namedRefusal } from "./named-refusal"

/** The form field of each key of an Account's `payout` and `fee`, by the key straight after the section. */
const SECTION_FIELDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
	payout: {
		payout: "payoutRate",
		bps: "payoutRate",
		frequency: "payoutFrequency",
		rounding: "payoutRounding",
		start: "payoutStart",
		startAt: "payoutStart",
		label: "payoutKind",
	},
	fee: { fee: "feeRate", bps: "feeRate", rounding: "feeRounding" },
}
/** The dates the employer's Flow copies from the salary, by their key: the person types them at the salary's own fields. */
const COPIED_DATES: Readonly<Record<string, string>> = {
	start: "start",
	startAt: "start",
	end: "end",
	endAt: "end",
}
const EMPLOYER_FIELDS: Readonly<Record<string, string>> = {
	num: "employerShare",
	den: "employerShare",
	rounding: "employerRounding",
}

/** Whether a refusal's path begins with the whole path of the item the form edits. */
function owns(path: readonly string[], item: readonly string[]): boolean {
	return item.length <= path.length && item.every((segment, at) => path[at] === segment)
}

/**
 * The field of a refusal under an Account's `payout` or `fee`, or null. The key straight after the section names the field, so
 * `payout.prepayments.0.bps` is no share: it is not a field of the form and falls to the general problem.
 */
function sectionField(segments: readonly string[], fields: readonly string[]): string | null {
	for (const [section, names] of Object.entries(SECTION_FIELDS)) {
		const at = segments.indexOf(section)
		const field = at < 0 ? undefined : names[segments[at + 1] ?? section]
		if (field !== undefined && fields.includes(field)) return field
	}
	return null
}

/**
 * Whether a refusal is about a household anchor as a whole: `document.anchors.0.path` (END_BEFORE_START) and
 * `document.anchors.0` (an age out of range) end in no field of the anchor form, and the date they refuse comes from its age.
 */
function anchorWhole(rest: readonly string[], item: readonly string[]): boolean {
	if (!item.includes("anchors")) return false
	return rest.length === 0 || rest[rest.length - 1] === "path"
}

/** The field of a refusal under the employer's Flow, or undefined when the path names another item. */
function employerFieldOf(
	path: readonly string[],
	employer: readonly string[],
	fields: readonly string[],
): string | null | undefined {
	if (!owns(path, employer)) return undefined
	const date = COPIED_DATES[path[employer.length] ?? ""]
	if (date !== undefined && fields.includes(date)) return date
	if (!fields.includes("employerAccount")) return null
	return EMPLOYER_FIELDS[path[path.length - 1] ?? ""] ?? "employerAccount"
}

/** The field a refusal names under the item's own path, or null when it names none of the form's fields. */
function fieldOfRest(
	rest: readonly string[],
	item: readonly string[],
	fields: readonly string[],
): string | null {
	const last = rest[rest.length - 1] ?? ""
	if (fields.includes(last)) return last
	if (rest.includes("growth") && fields.includes("rate")) return "rate"
	if (anchorWhole(rest, item) && fields.includes("age")) return "age"
	return sectionField(rest, fields)
}

/**
 * The form field a refusal names, or null when it names none. `item` is the whole path of the item within the document, as
 * segments, such as `["flows", "salary"]`, and `employer` the path of the employer Flow the same form writes. A refusal at
 * another item, or at a path no field owns, is the form's own problem. A rate's path runs through `growth`, so `growth`
 * names `rate`. An Account's `payout` and `fee` have their own fields, found by the key the path ends in under them. A
 * path's last key must also be a field of this form: a Flow's tax `label` is no field, because its Name field is
 * `displayLabel`. A path's segments follow cli ADR-0024, so an id with a `.` in it stays one segment.
 */
export function fieldOfRefusal(
	error: ErrorBody | null,
	fields: readonly string[],
	item: readonly string[],
	employer?: readonly string[],
): string | null {
	if (error?.path === undefined) return null
	const local = localPath(splitPath(error.path))
	const employerNamed =
		employer === undefined ? undefined : employerFieldOf(local, employer, fields)
	if (employerNamed !== undefined) return employerNamed
	if (!owns(local, item)) return null
	return fieldOfRest(local.slice(item.length), item, fields)
}
