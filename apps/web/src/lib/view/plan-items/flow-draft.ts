import { type ScenarioFlow, scenarioFlow } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import type { FlowDraft, FlowKind } from "./flows"
import { isDateText, slugId, typedAmount, uniqueId, withoutKeys } from "./form"
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
	// A once Flow shows no Ends field, so it has no end text to check.
	if (draft.frequency !== "once" && end !== "" && !isDateText(end)) {
		problems.set("end", "Enter the end as YYYY-MM-DD, or leave it empty to run to the horizon.")
	}
	if (draft.growth !== "inflation" && parseBps(draft.rate) === null) {
		problems.set("rate", "Enter a percent with at most two places, such as 3 or 3.50.")
	}
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
	const end = keptEndOf(draft)
	const rate = draft.growth === "inflation" ? "inflation" : parseBps(draft.rate)
	const category = categoryOf(draft, options.kind)
	return {
		...withoutKeys(options.existing ?? {}, ["amount", "growth", "end", "earned", "category"]),
		id: options.existing?.id ?? uniqueId(slugId(draft.name), options.taken),
		kind: options.kind,
		frequency: draft.frequency,
		start: draft.start,
		amount: typedAmount(draft.amount),
		growth: rate === "inflation" ? "inflation" : { bps: rate },
		...(end === undefined ? {} : { end }),
		...(options.kind === "income" ? { earned: draft.earned } : {}),
		...(category === null ? {} : { category }),
	}
}

/**
 * The end a draft saves. A once Flow lands on its start alone, so it keeps an end only when it repeats the start (cli
 * `ONCE_FLOW_END_MISMATCH`); any other Flow keeps its text, and an empty one runs to the horizon.
 */
function keptEndOf(draft: FlowDraft): string | undefined {
	const end = draft.end.trim()
	if (draft.frequency === "once") return end === draft.start ? end : undefined
	return end === "" ? undefined : end
}

/** The problem shown at an expense's category that is not 1 to 64 characters, none a control character (cli schema). */
export const CATEGORY_PROBLEM = "Enter a category of 1 to 64 characters, or leave it empty."

/** Whether a category is 1 to 64 characters, none of them a control character. */
export function isCategoryText(category: string): boolean {
	if (category.length < 1 || category.length > 64) return false
	return [...category].every((char) => {
		const code = char.charCodeAt(0)
		return code >= 32 && code !== 127
	})
}

/** The category a draft names for an expense, trimmed; null for an empty one and for any other kind of Flow. */
function categoryOf(draft: FlowDraft, kind: FlowKind): string | null {
	if (kind !== "expense") return null
	const category = draft.category.trim()
	return category === "" ? null : category
}
