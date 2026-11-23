/**
 * The Flow a withdrawal draft saves as (cli ADR 0063): an expense with a `rule`, or, for a level amount, a plain
 * expense that keeps pace with inflation. A rate or an amount is the person's text, sent as typed once its shape is
 * right; `traj` reads it. An existing Flow keeps every field the form does not show.
 */
import { type ScenarioFlow, scenarioFlow } from "../../contract/scenario-show"
import { parseBps } from "../../format/bps"
import { typedAmount, uniqueId, withoutKeys } from "../plan-items/form"
import type { Problems } from "../plan-items/problems"
import { hasGuard, percentText, problemsOf } from "./check"
import type { BoundDraft, GuardDraft, WithdrawalDraft } from "./draft"
import { WITHDRAWAL_ID } from "./rule"

/** The outcome of a withdrawal form: the Flow to save, or the problems it shows at its fields. */
export type WithdrawalResult = { ok: true; flow: ScenarioFlow } | { ok: false; problems: Problems }

/** A bound as the document holds it: its amount in major units and how it grows. */
function boundOf(bound: BoundDraft): Record<string, unknown> | undefined {
	if (bound.amount.trim() === "") return undefined
	const bps = parseBps(bound.rate)
	return {
		amount: typedAmount(bound.amount),
		growth: bound.growth === "fixed" ? { bps } : "inflation",
	}
}

/** A guardrail as the document holds it, or undefined when the form left it empty. */
function guardOf(guard: GuardDraft): Record<string, unknown> | undefined {
	if (!hasGuard(guard)) return undefined
	return { bps: percentText(guard.band), adjustBps: percentText(guard.move) }
}

/** The rule a draft names, with the keys of its own kind only. */
function ruleOf(draft: WithdrawalDraft): Record<string, unknown> {
	const base = {
		kind: draft.how,
		portfolio: draft.portfolio,
		rateBps: percentText(draft.rate),
		rounding: draft.rounding,
	}
	if (draft.how === "currentRate") {
		const steps = draft.steps.map((step) => ({
			from: step.from.trim(),
			bps: percentText(step.rate),
		}))
		return {
			...base,
			...(steps.length > 0 ? { steps } : {}),
			...optional("floor", boundOf(draft.floor)),
			...optional("ceiling", boundOf(draft.ceiling)),
		}
	}
	if (draft.how === "guardrails") {
		return {
			...base,
			...optional("upper", guardOf(draft.upper)),
			...optional("lower", guardOf(draft.lower)),
		}
	}
	return base
}

/** A key with its value, or no key at all when the value is absent. */
function optional(
	key: string,
	value: Record<string, unknown> | undefined,
): Record<string, unknown> {
	return value === undefined ? {} : { [key]: value }
}

/**
 * The Flow a draft names. A new Flow takes the conventional id; a Milestone start keeps the Flow's own `start` (the
 * As-of for a new one), because recurrence and growth stay anchored on it (sim ADR 0012).
 */
export function withdrawalFromDraft(
	draft: WithdrawalDraft,
	options: { existing?: ScenarioFlow | undefined; taken: readonly string[]; asOf: string },
): WithdrawalResult {
	const problems = problemsOf(draft)
	if (problems.size > 0) return { ok: false, problems: Object.fromEntries(problems) }
	const { existing } = options
	const milestone = draft.startMode === "milestone"
	const candidate = {
		...withoutKeys(existing ?? {}, [
			"amount",
			"growth",
			"rule",
			"derive",
			"level",
			"start",
			"startAt",
			"frequency",
		]),
		id: existing?.id ?? uniqueId(WITHDRAWAL_ID, options.taken),
		kind: "expense",
		frequency: draft.frequency,
		start: milestone ? (existing?.start ?? options.asOf) : draft.start.trim(),
		...(milestone ? { startAt: draft.milestone } : {}),
		...(draft.how === "level"
			? { amount: typedAmount(draft.amount), growth: "inflation" }
			: { rule: ruleOf(draft) }),
	}
	const parsed = scenarioFlow.safeParse(candidate)
	if (!parsed.success)
		return { ok: false, problems: { general: "The spending cannot be saved as it is." } }
	return { ok: true, flow: parsed.data }
}
