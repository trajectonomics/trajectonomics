import { type ScenarioFlow, scenarioFlow } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import { CATEGORY_PROBLEM, categoryOf, isCategoryText } from "./expense-category"
import type { FlowDraft, FlowKind } from "./flows"
import { isDateText, slugId, typedAmount, uniqueId, withoutKeys } from "./form"
import { labelOf, labelProblem } from "./label-text"
import type { Problems } from "./problems"

/** The outcome of a form: the Flow to save, or the problems the form shows at its fields. */
export type FlowResult = { ok: true; flow: ScenarioFlow } | { ok: false; problems: Problems }

/** The problems a draft has at its fields: each text that is not a shape `traj` may take. */
function problemsOf(draft: FlowDraft, isNew: boolean): Map<string, string> {
	const problems = new Map<string, string>()
	if (isNew && slugId(draft.name) === "") problems.set("name", "Enter a name for the item.")
	if (typedAmount(draft.amount) === null) {
		problems.set("amount", "Enter the amount as a decimal number, such as 9000.50.")
	}
	if (!isDateText(draft.start)) problems.set("start", "Enter the start as YYYY-MM-DD.")
	const end = draft.end.trim()
	if (end !== "" && !isDateText(end)) {
		problems.set("end", "Enter the end as YYYY-MM-DD, or leave it empty to run to the horizon.")
	}
	if (draft.growth !== "inflation" && parseBps(draft.rate) === null) {
		problems.set("rate", "Enter a percent with at most two places, such as 3 or 3.50.")
	}
	const label = labelProblem(draft.displayLabel)
	if (label !== null) problems.set("displayLabel", label)
	return problems
}

/**
 * The Flow a draft names. A new Flow's id is made from its name; an existing one keeps its id and every
 * field the form does not show. The checks are shape checks: the amount and the dates stay text, and
 * `traj` refuses what it cannot accept.
 */
export function flowFromDraft(
	draft: FlowDraft,
	options: { kind: FlowKind; existing?: ScenarioFlow | undefined; taken: readonly string[] },
): FlowResult {
	const problems = problemsOf(draft, options.existing === undefined)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const category = categoryOf(draft, options.kind)
	if (category !== null && !isCategoryText(category)) {
		return { ok: false, problems: { category: CATEGORY_PROBLEM } }
	}
	const candidate = candidateOf(draft, options)
	const parsed = scenarioFlow.safeParse(candidate)
	if (!parsed.success)
		return { ok: false, problems: { general: "The item cannot be saved as it is." } }
	return { ok: true, flow: parsed.data }
}

/** The Flow as the document will hold it: the form's fields over the Flow's own, with empty fields removed. */
function candidateOf(
	draft: FlowDraft,
	options: { kind: FlowKind; existing?: ScenarioFlow | undefined; taken: readonly string[] },
): Record<string, unknown> {
	const end = draft.end.trim()
	const rate = draft.growth === "inflation" ? "inflation" : parseBps(draft.rate)
	const category = categoryOf(draft, options.kind)
	const label = labelOf(draft.displayLabel)
	return {
		...withoutKeys(options.existing ?? {}, [
			"amount",
			"growth",
			"end",
			"earned",
			"category",
			"displayLabel",
		]),
		id: options.existing?.id ?? uniqueId(slugId(draft.name), options.taken),
		kind: options.kind,
		frequency: draft.frequency,
		start: draft.start,
		amount: typedAmount(draft.amount),
		growth: rate === "inflation" ? "inflation" : { bps: rate },
		...(end === "" ? {} : { end }),
		...(options.kind === "income" ? { earned: draft.earned } : {}),
		...(category === null ? {} : { category }),
		...(label === null ? {} : { displayLabel: label }),
	}
}
