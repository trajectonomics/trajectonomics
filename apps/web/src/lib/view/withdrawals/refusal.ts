/**
 * Which field of the withdrawal form a `traj` refusal names. A path is read as the CLI writes it, by the index of
 * the item in its list (`document.flows.3.rule.portfolio.0`) or by its id, so both are matched against where the
 * Flow and the expenses it stops sit in the document the save sent. A Milestone's own path (the `next12Months`
 * refusal) is shown at the start.
 */
import type { ErrorBody, ScenarioDocument } from "../../contract"
import type { Problems, Shown } from "../plan-items/problems"

/** Where the withdrawal Flow, and the expenses it stops, sit in the document a save sends. */
export interface WithdrawalLayout {
	readonly flow: { id: string; index: number }
	readonly stops: readonly { id: string; index: number }[]
}

/** The layout of a Flow in the document it is saved in. */
export function layoutOf(
	doc: ScenarioDocument,
	flowId: string,
	stops: readonly string[],
): WithdrawalLayout {
	const at = (id: string) => ({ id, index: doc.flows.findIndex((flow) => flow.id === id) })
	return { flow: at(flowId), stops: stops.map(at) }
}

const NONE: WithdrawalLayout = { flow: { id: "", index: -1 }, stops: [] }

/** Whether a path segment names an item: by its id, or by its index in the document's list. */
function names(segment: string | undefined, item: { id: string; index: number }): boolean {
	return segment !== undefined && (segment === item.id || segment === String(item.index))
}

const RULE_FIELDS: Readonly<Record<string, string>> = {
	portfolio: "portfolio",
	rateBps: "rate",
	rounding: "rounding",
	steps: "steps",
	floor: "floor",
	ceiling: "ceiling",
	upper: "upper",
	lower: "lower",
	kind: "how",
}

/** The field of the Flow's own path: its rule's parts, its frequency, its amount or its start. */
function flowField(rest: readonly string[]): string | null {
	const [field, part] = rest
	if (field === "rule") return part === undefined ? "how" : (RULE_FIELDS[part] ?? "how")
	if (field === "frequency") return "frequency"
	if (field === "amount" || field === "growth") return "amount"
	if (field === "start" || field === "startAt") return "start"
	return null
}

/** The form field a refusal names, or null. */
export function withdrawalFieldOfRefusal(
	error: ErrorBody | null,
	layout: WithdrawalLayout,
): string | null {
	const segments = error?.path?.split(".") ?? []
	const milestone = segments.indexOf("milestones")
	if (milestone >= 0) return "start"
	const at = segments.indexOf("flows")
	if (at < 0) return null
	const [, ref, ...rest] = segments.slice(at)
	if (names(ref, layout.flow)) return flowField(rest)
	return layout.stops.some((stop) => names(ref, stop)) && rest[0] === "endAt" ? "stops" : null
}

/** What the form shows: its own problems, and the CLI's refusal, in its own words, at the field its path names. */
export function withdrawalShown(
	problems: Problems,
	refusal: ErrorBody | null,
	message: string | null,
	layout: WithdrawalLayout = NONE,
): Shown {
	const refused = withdrawalFieldOfRefusal(refusal, layout)
	const text = message ?? undefined
	return {
		at: (field) => problems[field] ?? (refused === field ? text : undefined),
		general: problems["general"] ?? (refused === null ? text : undefined),
	}
}
