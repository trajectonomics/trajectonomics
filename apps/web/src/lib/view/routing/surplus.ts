/**
 * One step of "When there is money left over" as the drawer states it (sim ADR 0030): an Account, then everything, an amount
 * up to which it fills (that may keep its value in today's money), or a share of what is left. The amount and the share are
 * kept as the person typed them; `traj` checks their range and says so in its own words.
 */

import type { Problems } from "../plan-items/problems"
import { percentText } from "../withdrawals/check"
import type { Step } from "./entries"
import { AMOUNT_WORDS, type TargetDraft, targetDraftOf, targetFromDraft } from "./targets"

export type How = "all" | "upTo" | "share" | "shareUpTo"

export interface StepDraft extends TargetDraft {
	account: string
	how: How
	share: string
}

function howOf(step?: Step): How {
	if (step === undefined) return "all"
	if (step.share === undefined) return step.upTo === undefined ? "all" : "upTo"
	return step.upTo === undefined ? "share" : "shareUpTo"
}

/** The draft of a stored step, or a blank one that takes everything. */
export function stepDraftOf(step?: Step): StepDraft {
	return {
		...targetDraftOf(step?.upTo),
		account: step?.account ?? "",
		how: howOf(step),
		share: step?.share ?? "",
	}
}

/** Whether a step takes everything that is left: no share and no cap. */
export function takesAll(step: Step): boolean {
	return step.share === undefined && step.upTo === undefined
}

/** The outcome of a drawer: the step it names, or the problems it shows at its fields. */
export type StepResult = { ok: true; step: Step } | { ok: false; problems: Problems }

/** The cap a draft names, null when it has none, or the problem at the amount. */
function capOf(draft: StepDraft, old?: Step): { cap: Step["upTo"] | null; problem?: string } {
	if (draft.how !== "upTo" && draft.how !== "shareUpTo") return { cap: null }
	const cap = targetFromDraft(draft, old?.upTo)
	return cap === null ? { cap, problem: AMOUNT_WORDS } : { cap }
}

/** The share a draft names, null when it has none, or the problem at the share. */
function shareOf(draft: StepDraft): { share: string | null; problem?: string } {
	if (draft.how !== "share" && draft.how !== "shareUpTo") return { share: null }
	const share = percentText(draft.share)
	return share === null ? { share, problem: SHARE_WORDS } : { share }
}

const SHARE_WORDS = "Enter a percent with at most two places, such as 30."

/** The step a draft names over the stored one, whose other keys are kept. */
export function stepFromDraft(draft: StepDraft, old?: Step): StepResult {
	const { cap, problem: capProblem } = capOf(draft, old)
	const { share, problem: shareProblem } = shareOf(draft)
	const problems: Record<string, string> = {}
	if (draft.account === "") problems["account"] = "Choose an account."
	if (capProblem !== undefined) problems["amount"] = capProblem
	if (shareProblem !== undefined) problems["share"] = shareProblem
	if (Object.keys(problems).length > 0) return { ok: false, problems }
	const { upTo: _cap, share: _share, ...kept } = old ?? { account: "" }
	const step: Step = { ...kept, account: draft.account }
	if (cap !== null && cap !== undefined) step.upTo = cap
	if (share !== null) step.share = share
	return { ok: true, step }
}

export const LAST_WORDS =
	"The last step must take everything that is left: take its share and amount away, or add a step after it that takes everything."

/** The row that breaks the last-step rule, with the sentence, or null: the last step must take everything. */
export function lastStepProblem(steps: readonly Step[]): { index: number; message: string } | null {
	const last = steps.at(-1)
	return last === undefined || takesAll(last)
		? null
		: { index: steps.length - 1, message: LAST_WORDS }
}

/**
 * The steps with `step` put in: replacing the one at `index`, or added as a new one. A new step that takes less than
 * everything goes before the last step, so the last one still takes everything; one that takes everything goes at the end.
 */
export function withStep(steps: readonly Step[], index: number | null, step: Step): Step[] {
	if (index !== null) return steps.map((one, at) => (at === index ? step : one))
	if (takesAll(step) || steps.length === 0) return [...steps, step]
	return [...steps.slice(0, -1), step, ...steps.slice(-1)]
}
