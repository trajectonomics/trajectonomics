import type { ErrorBody } from "../../contract"

/** The form field of each key of an Account's `payout` and `fee`, and of the employer's Flow, by the key a refusal's path ends in. */
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
const EMPLOYER_FIELDS: Readonly<Record<string, string>> = {
	num: "employerShare",
	den: "employerShare",
	rounding: "employerRounding",
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

/** The field of a refusal on a salary's employer Flow (`<salary>-employer`), or null. */
function employerField(segments: readonly string[], fields: readonly string[]): string | null {
	if (!fields.includes("employerAccount") || !segments.some((one) => one.endsWith("-employer"))) {
		return null
	}
	return EMPLOYER_FIELDS[segments[segments.length - 1] ?? ""] ?? "employerAccount"
}

/**
 * Whether a refusal is about a household anchor as a whole: `document.anchors.0.path` (END_BEFORE_START) and
 * `document.anchors.0` (an age out of range) end in no field of the anchor form, and the date they refuse comes from its age.
 */
function anchorRefusal(segments: readonly string[]): boolean {
	const at = segments.indexOf("anchors")
	if (at < 0) return false
	const rest = segments.slice(at + 2)
	return (
		/^\d+$/.test(segments[at + 1] ?? "") && (rest.length === 0 || rest[rest.length - 1] === "path")
	)
}

/**
 * The form field a refusal names, or null when it names none. The CLI's path ends in the field
 * (`document.flows.salary.amount`), and a rate's path runs through `growth`, so `growth` names `rate`. An Account's
 * `payout` and `fee` and a salary's employer Flow have their own fields, found by the key the path ends in under them.
 * A path's last key must also be a field of this form: a Flow's tax `label` is no field, because its Name field is
 * `displayLabel`.
 */
export function fieldOfRefusal(error: ErrorBody | null, fields: readonly string[]): string | null {
	if (error?.path === undefined) return null
	const segments = error.path.split(".")
	const last = segments[segments.length - 1] ?? ""
	if (fields.includes(last)) return last
	if (segments.includes("growth") && fields.includes("rate")) return "rate"
	if (anchorRefusal(segments) && fields.includes("age")) return "age"
	return sectionField(segments, fields) ?? employerField(segments, fields)
}

/**
 * The refusal with the position of a Flow in its path turned into the Flow's id: `traj` names `document.flows.1.label`,
 * and the form knows the Flow by its id. `flows` are the ids of the document the Edit sent, in its order.
 */
export function namedRefusal(error: ErrorBody | null, flows: readonly string[]): ErrorBody | null {
	if (error?.path === undefined) return error
	const segments = error.path.split(".")
	const at = segments.indexOf("flows")
	const id = at < 0 ? undefined : flows[Number(segments[at + 1])]
	if (id === undefined) return error
	return { ...error, path: [...segments.slice(0, at + 1), id, ...segments.slice(at + 2)].join(".") }
}
