/**
 * The Withdrawals form as it holds its text. Every rate is the person's own estimate: no field starts with a value
 * (`traj` ships none, cli ADR 0063), and the rounding has no default either. The form moves text and never works a
 * figure out: a rate or an amount stays as typed until `traj` reads it (web ADR 0002).
 */
import type { ScenarioFlow } from "../../contract"
import {
	defaultPortfolio,
	milestoneIds,
	retirementMilestone,
	type WithdrawalContext,
} from "./context"
import { isLevelAmount, ruleOf } from "./rule"
import { ruleDraftOf } from "./rule-draft"

/** A floor or ceiling as text: an empty amount means the rule has none. */
export interface BoundDraft {
	amount: string
	/** "inflation", or "fixed" for the percent in `rate`. */
	growth: string
	rate: string
}

/** A guardrail as text: both parts empty means the rule has none. */
export interface GuardDraft {
	band: string
	move: string
}

/** A step of rates by date. */
export interface StepDraft {
	from: string
	rate: string
}

/** The text of a withdrawal form. `how` is "" until the person chooses, then "level" or a rule kind. */
export interface WithdrawalDraft {
	how: string
	frequency: string
	amount: string
	rate: string
	steps: StepDraft[]
	floor: BoundDraft
	ceiling: BoundDraft
	upper: GuardDraft
	lower: GuardDraft
	/** "" until the person chooses: a rounding is a money rule they state. */
	rounding: string
	portfolio: string[]
	/** "milestone" (the rule lands on or after a Milestone) or "date". */
	startMode: string
	milestone: string
	start: string
	/** The ids of the other expenses that stop when the rule starts. */
	stops: string[]
}

/** Where the rule starts: the Flow's Milestone, else a date; a new one starts at the retirement Milestone when it has one. */
function startOf(
	flow: ScenarioFlow | undefined,
	ctx: WithdrawalContext,
): Pick<WithdrawalDraft, "startMode" | "milestone" | "start"> {
	if (flow?.startAt !== undefined)
		return { startMode: "milestone", milestone: flow.startAt, start: "" }
	if (flow !== undefined) return { startMode: "date", milestone: "", start: flow.start }
	const retire = retirementMilestone(ctx.doc)
	if (retire !== null) return { startMode: "milestone", milestone: retire, start: "" }
	const some = milestoneIds(ctx.doc).length > 0
	return { startMode: some ? "milestone" : "date", milestone: "", start: "" }
}

/** The other expenses a Milestone start already stops, as ticked: none for a new Flow or a date start. */
function stopsOf(
	flow: ScenarioFlow | undefined,
	milestone: string,
	ctx: WithdrawalContext,
): string[] {
	if (flow === undefined || milestone === "") return []
	return ctx.doc.flows
		.filter((one) => one.endAt === milestone && one.id !== flow.id)
		.map((one) => one.id)
}

/** The form's text for a withdrawal Flow to edit, or an empty one for a new Flow. */
export function draftOf(flow: ScenarioFlow | undefined, ctx: WithdrawalContext): WithdrawalDraft {
	const rule = flow === undefined ? null : ruleOf(flow)
	const start = startOf(flow, ctx)
	return {
		how: rule?.kind ?? (flow !== undefined && isLevelAmount(flow) ? "level" : ""),
		frequency: flow?.frequency === "annual" ? "annual" : "monthly",
		amount: flow?.amount ?? "",
		...ruleDraftOf(rule),
		portfolio: rule?.portfolio ?? defaultPortfolio(ctx),
		...start,
		stops: stopsOf(flow, start.milestone, ctx),
	}
}
