/**
 * The transfer Flow a draft names (sim ADR 0031, cli ADR 0070). The amount, the share and the dates are kept as the person
 * typed them: the page checks their shape and `traj` says whether they are allowed. `realise` is written only when it is on,
 * so a transfer that leaves it off holds no key and the engine's default stands.
 */
import { type ScenarioFlow, scenarioFlow } from "../../contract"
import { parseBps } from "../../format"
import { isDateText, typedAmount, uniqueId, withoutKeys } from "../plan-items/form"
import type { Problems } from "../plan-items/problems"
import { AMOUNT_WORDS } from "./targets"
import type { TransferContext, TransferDraft } from "./transfer-draft"
import { allOf, shareOf } from "./transfer-read"

export type TransferResult = { ok: true; flow: ScenarioFlow } | { ok: false; problems: Problems }

const DATE_WORDS = "Enter the date as YYYY-MM-DD."

/** The problems at the accounts and the amount. */
function whatProblems(draft: TransferDraft): Record<string, string> {
	const found: Record<string, string> = {}
	if (draft.source === "") found["source"] = "Choose the account the money leaves."
	if (draft.target === "") found["target"] = "Choose the account or loan the money goes to."
	if (draft.how === "amount" && typedAmount(draft.amount) === null) found["amount"] = AMOUNT_WORDS
	if (draft.how === "share" && parseBps(draft.share) === null) {
		found["share"] = "Enter a percent with at most two places, such as 10."
	}
	return found
}

/** The problem at the start, or none. */
function startProblem(draft: TransferDraft, ctx: TransferContext): string | undefined {
	if (draft.when === "date") return isDateText(draft.date.trim()) ? undefined : DATE_WORDS
	if (draft.when === "milestone") {
		return ctx.milestones.includes(draft.milestone) ? undefined : "Choose a Milestone."
	}
	const named = ctx.anchors.some((one) => one.value === draft.anchor)
	return named ? undefined : "Choose a date the household names."
}

/** The problems of a draft, each at its field. */
function problemsOf(draft: TransferDraft, ctx: TransferContext): Record<string, string> {
	const found = whatProblems(draft)
	const start = startProblem(draft, ctx)
	if (start !== undefined) found["start"] = start
	if (draft.end.trim() !== "" && !isDateText(draft.end.trim())) found["end"] = DATE_WORDS
	return found
}

/** The start fields: a date, the date a household names, or a Milestone (the Flow keeps its own `start` to count from). */
function startOf(
	draft: TransferDraft,
	ctx: TransferContext,
	old?: ScenarioFlow,
): Record<string, string> {
	if (draft.when === "milestone") return { start: old?.start ?? ctx.asOf, startAt: draft.milestone }
	const anchor = ctx.anchors.find((one) => one.value === draft.anchor)
	return { start: draft.when === "anchor" ? (anchor?.date ?? "") : draft.date.trim() }
}

/** The amount fields: a typed amount that stays or follows inflation, all of the source, or a share of it. */
function amountOf(draft: TransferDraft): Record<string, unknown> {
	if (draft.how === "all") return { derive: allOf(draft.source) }
	if (draft.how === "share") return { derive: shareOf(draft.source, parseBps(draft.share) ?? 0) }
	return { amount: typedAmount(draft.amount), growth: draft.real ? "inflation" : { bps: 0 } }
}

/** The transfer a draft names over the stored one; its other keys are kept, and a new one takes an id that is free. */
export function transferFromDraft(
	draft: TransferDraft,
	options: { existing?: ScenarioFlow | undefined; taken: readonly string[]; ctx: TransferContext },
): TransferResult {
	const problems = problemsOf(draft, options.ctx)
	if (Object.keys(problems).length > 0) return { ok: false, problems }
	const { existing } = options
	const end = draft.end.trim()
	const parsed = scenarioFlow.safeParse({
		...withoutKeys(existing ?? {}, [
			"amount",
			"growth",
			"derive",
			"start",
			"startAt",
			"end",
			"realise",
		]),
		id: existing?.id ?? uniqueId("transfer", options.taken),
		kind: "transfer",
		source: draft.source,
		target: draft.target,
		frequency: draft.frequency,
		...startOf(draft, options.ctx, existing),
		...(end === "" ? {} : { end }),
		...amountOf(draft),
		...(draft.realise ? { realise: true } : {}),
	})
	return parsed.success
		? { ok: true, flow: parsed.data }
		: { ok: false, problems: { general: "The move cannot be saved as it is." } }
}
