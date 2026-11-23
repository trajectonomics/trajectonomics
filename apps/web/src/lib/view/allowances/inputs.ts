import type { AllowancePlan } from "../../snapshot/allowance-params"
import { allowancePlan } from "../../snapshot/allowance-params"
import { chosenLabels, type OrderChoice } from "./order"

/** The step the page pre-fills: 1,000 in the plan's currency, which the person may change. `traj` has no default. */
export const DEFAULT_STEP = "1000"

/** The text of the step and limit fields. The least saving is never pre-filled: it is the person's choice. */
export interface InputDraft {
	step: string
	budget: string
	minSaving: string
}

/** The fields' text for the inputs the Snapshot holds, or for a first visit. */
export function draftOf(plan: AllowancePlan | null): InputDraft {
	return {
		step: plan?.step ?? DEFAULT_STEP,
		budget: plan?.budget ?? "",
		minSaving: plan?.minSaving ?? "",
	}
}

/** Where the person typed something the read cannot take: a sentence per field. */
export type InputProblems = Partial<Record<"labels" | "step" | "budget" | "minSaving", string>>

/** The outcome of the form: the inputs to read with, or the problems at their fields. */
export type InputResult = { ok: true; plan: AllowancePlan } | { ok: false; problems: InputProblems }

const FIELDS = ["labels", "step", "budget", "minSaving"] as const

/** The inputs the order and the fields state; an empty limit is none. Checked by the same schema the server uses. */
export function planFromDraft(order: readonly OrderChoice[], draft: InputDraft): InputResult {
	const candidate = {
		labels: chosenLabels(order),
		step: draft.step.trim(),
		budget: draft.budget.trim() === "" ? null : draft.budget.trim(),
		minSaving: draft.minSaving.trim() === "" ? null : draft.minSaving.trim(),
	}
	const parsed = allowancePlan.safeParse(candidate)
	if (parsed.success) return { ok: true, plan: parsed.data }
	const problems: InputProblems = {}
	for (const issue of parsed.error.issues) {
		const field = FIELDS.find((name) => name === issue.path[0])
		if (field !== undefined && problems[field] === undefined) problems[field] = issue.message
	}
	return { ok: false, problems }
}
