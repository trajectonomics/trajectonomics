/**
 * Paying a loan extra: one Contribution into its liability, once or every month until an end (cli ADR 0059).
 * The engine caps a payment at what is owed, so the page states the amount and `traj` decides the rest.
 */
import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import { scenarioFlow } from "../../contract/scenario-show"
import { flowIds } from "./document"
import { isDateText, typedAmount } from "./form"
import type { Problems } from "./problems"

/** The text of an extra-payment form. `mode` is "once", or "monthly" with an `end`. */
export interface ExtraDraft {
	readonly amount: string
	readonly mode: string
	readonly start: string
	readonly end: string
}

/** The outcome of an extra-payment form: the Flow to save, or the problems it shows at its fields. */
export type ExtraResult = { ok: true; flow: ScenarioFlow } | { ok: false; problems: Problems }

/** A new extra payment: once, on no date yet, with no amount. */
export function extraDraftOf(): ExtraDraft {
	return { amount: "", mode: "once", start: "", end: "" }
}

/** The first `<loan>-extra-<n>` id, from 1, that no Flow of the document holds. */
export function extraPaymentId(loanId: string, taken: readonly string[]): string {
	for (let index = 1; ; index++) {
		const id = `${loanId}-extra-${index}`
		if (!taken.includes(id)) return id
	}
}

/** The problems an extra-payment draft has at its fields. */
function problemsOf(draft: ExtraDraft): Map<string, string> {
	const problems = new Map<string, string>()
	if (typedAmount(draft.amount) === null) {
		problems.set("amount", "Enter the amount as a decimal number, such as 10000.00.")
	}
	if (draft.mode !== "once" && draft.mode !== "monthly") {
		problems.set("mode", "Choose once, or monthly until an end.")
	}
	if (!isDateText(draft.start)) problems.set("start", "Enter the date as YYYY-MM-DD.")
	if (draft.mode === "monthly" && !isDateText(draft.end)) {
		problems.set("end", "Enter the last date as YYYY-MM-DD.")
	}
	return problems
}

/** The extra payment a draft names: a Contribution into the loan's Account, with a fixed amount. */
export function extraFromDraft(
	draft: ExtraDraft,
	options: { loanId: string; doc: ScenarioDocument },
): ExtraResult {
	const problems = problemsOf(draft)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const parsed = scenarioFlow.safeParse({
		id: extraPaymentId(options.loanId, flowIds(options.doc)),
		kind: "contribution",
		target: options.loanId,
		frequency: draft.mode,
		start: draft.start.trim(),
		amount: typedAmount(draft.amount),
		growth: { bps: 0 },
		...(draft.mode === "monthly" ? { end: draft.end.trim() } : {}),
	})
	if (!parsed.success) {
		return { ok: false, problems: { general: "The payment cannot be saved as it is." } }
	}
	return { ok: true, flow: parsed.data }
}
