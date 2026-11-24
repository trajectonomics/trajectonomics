/**
 * What an asset Account pays out and costs, as the form states it (sim ADR 0027 and 0028, cli ADR 0067, web ADR 0017): a
 * `payout` (a yearly share paid as passive income, how often, from when, and under which tax label) and a `fee` (a yearly
 * share charged every month). Every rate is the person's own and is sent as the percent text they typed; `traj` ships none.
 */
import type { ScenarioAccount } from "../../contract/scenario-show"
import type { DateChoice } from "../estate/dates"

export type Payout = NonNullable<ScenarioAccount["payout"]>
export type Fee = NonNullable<ScenarioAccount["fee"]>

/** The Thai Tally label of each kind of income a payout can be (cli ADR 0067); a payout without one is income no Levy is told about. */
export const PAYOUT_LABELS: Readonly<Record<string, string>> = {
	dividends: "income.section40_4.dividends",
	interest: "income.section40_4.interest",
	other: "income.section40_4",
}

/** The payout's text in the form. `from` is "now", "milestone", "anchor" or "date". */
export interface PayoutDraft {
	rate: string
	frequency: string
	rounding: string
	from: string
	milestone: string
	anchor: string
	date: string
	/** "dividends", "interest" or "other" under a tax Levy; empty for none chosen. */
	kind: string
}

/** The fee's text in the form. */
export interface FeeDraft {
	rate: string
	rounding: string
}

/** What a payout is made against: whether the plan is taxed, the Milestones, and the household's anchored dates. */
export interface IncomeContext {
	readonly taxed: boolean
	readonly milestones: readonly string[]
	readonly anchors: readonly DateChoice[]
}

export const NO_INCOME_CONTEXT: IncomeContext = { taxed: false, milestones: [], anchors: [] }

/** The kind of income a stored label says, or empty when it is none of the three the form writes. */
export function kindOf(label: string | undefined): string {
	return Object.keys(PAYOUT_LABELS).find((kind) => PAYOUT_LABELS[kind] === label) ?? ""
}

/** Where a stored payout starts from: "milestone", "now", "anchor" when a date the household names is its start, else "date". */
function fromOf(payout: Payout | undefined, anchor: DateChoice | undefined): string {
	if (payout?.startAt !== undefined) return "milestone"
	if (payout?.start === undefined) return "now"
	return anchor === undefined ? "date" : "anchor"
}

/** The payout draft of an Account's stored payout, or an empty draft with nothing chosen. */
export function payoutDraftOf(payout: Payout | undefined, ctx: IncomeContext): PayoutDraft {
	const anchor = ctx.anchors.find((one) => one.date === payout?.start)
	const from = fromOf(payout, anchor)
	return {
		rate: payout?.bps ?? "",
		frequency: payout?.frequency ?? "",
		rounding: payout?.rounding ?? "",
		from,
		milestone: payout?.startAt ?? "",
		anchor: anchor?.value ?? "",
		date: from === "date" ? (payout?.start ?? "") : "",
		kind: kindOf(payout?.label),
	}
}

/** The fee draft of an Account's stored fee. */
export function feeDraftOf(fee: Fee | undefined): FeeDraft {
	return { rate: fee?.bps ?? "", rounding: fee?.rounding ?? "" }
}

/** Whether anything is chosen or typed in the payout section; an untouched one is no payout. */
export function payoutUsed(draft: PayoutDraft): boolean {
	const typed = [draft.rate.trim(), draft.frequency, draft.rounding, draft.kind]
	return typed.some((text) => text !== "") || draft.from !== "now"
}
