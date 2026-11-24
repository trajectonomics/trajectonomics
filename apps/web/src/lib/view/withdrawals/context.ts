/**
 * What the Withdrawals form knows of the plan around the rule: its Milestones and their dates, the Accounts a
 * rule may read, and the other expenses that could stop when the rule starts. Reads the document and the CLI's
 * own dates; it works no figure out (web ADR 0002).
 */
import type { Baseline, ProjectionRun, Read, ScenarioDocument, ScenarioFlow } from "../../contract"
import { withdrawAccounts } from "../routing/entries"
import { ruleOf } from "./rule"

/** What a form is made against: the saved document, the As-of, the date each reached Milestone fired, and the Baseline's names. */
export interface WithdrawalContext {
	readonly doc: ScenarioDocument
	readonly asOf: string
	/** The fire date `projection run` states for each reached Milestone, by id. */
	readonly milestoneDates: Readonly<Record<string, string>>
	readonly baseline?: Read<Baseline> | undefined
}

/** The ids of the Milestones a document declares, in its order. */
export function milestoneIds(doc: ScenarioDocument): string[] {
	const milestones: unknown = doc["milestones"]
	if (!Array.isArray(milestones)) return []
	return milestones.flatMap((one: unknown) => {
		const id = typeof one === "object" && one !== null ? (one as { id?: unknown }).id : undefined
		return typeof id === "string" ? [id] : []
	})
}

/**
 * The plan's retirement Milestone, as a selection and never a figure: one whose id says retire, else the one
 * a salary or other income stops at (`endAt`) when exactly one is. Null when the plan has none to offer.
 */
export function retirementMilestone(doc: ScenarioDocument): string | null {
	const ids = milestoneIds(doc)
	const named = ids.find((id) => /retire/i.test(id))
	if (named !== undefined) return named
	const stops = new Set(
		doc.flows.flatMap((flow) =>
			flow.kind === "income" && flow.endAt !== undefined ? [flow.endAt] : [],
		),
	)
	const only = [...stops].filter((id) => ids.includes(id))
	return only.length === 1 ? (only[0] ?? null) : null
}

/** The fire dates of the reached Milestones of a run, by id. */
export function milestoneDatesOf(run: ProjectionRun | null): Record<string, string> {
	const table = run?.tables.find((one) => one.name === "milestones")
	if (table === undefined || table.name !== "milestones") return {}
	return Object.fromEntries(
		table.rows.flatMap((row) => (row.date === null ? [] : [[row.id, row.date] as const])),
	)
}

/** One Account a rule may read: its id in the document and the name the person knows it by. */
export interface PortfolioChoice {
	readonly id: string
	readonly label: string
}

/** The Account's name the Baseline states for it, or its id when the Baseline does not know it. */
export function accountNameOf(id: string, baseline: Read<Baseline> | undefined): string {
	if (baseline === undefined || !baseline.ok) return id
	const row = baseline.data.rows.find((one) => one.account.id === id || one.account.name === id)
	return row?.account.name ?? id
}

/** The asset Accounts a rule may read: a liability and an Account marked `liquid: false` are never offered. */
export function portfolioChoices(ctx: WithdrawalContext): PortfolioChoice[] {
	return ctx.doc.accounts
		.filter((account) => account.kind === "asset" && account.liquid !== false)
		.map((account) => ({ id: account.id, label: accountNameOf(account.id, ctx.baseline) }))
}

/** The Accounts a new rule reads at first: the liquid assets of the plan's withdraw list, each removable. */
export function defaultPortfolio(ctx: WithdrawalContext): string[] {
	// An entry with a floor is `{ account, downTo }`, so the list is read by each entry's Account (web ADR 0021).
	const listed = withdrawAccounts(ctx.doc)
	return portfolioChoices(ctx)
		.map((choice) => choice.id)
		.filter((id) => listed.includes(id))
}

/** The date the rule starts on, as the CLI states it: the Milestone's fire date, or the typed date. Null when unknown. */
export function startDateOf(
	ctx: WithdrawalContext,
	draft: { startMode: string; milestone: string; start: string },
): string | null {
	if (draft.startMode === "milestone") return ctx.milestoneDates[draft.milestone] ?? null
	return /^\d{4}-\d{2}-\d{2}$/.test(draft.start) ? draft.start : null
}

/**
 * The other expenses that could stop when the rule starts: still running at the start (no end, or an end on or
 * after it) and not already ended by another Milestone, plus the ones this Milestone already ends so a person can
 * take that back. A rule Flow is never listed: it pays for life from its own start.
 */
export function stoppableExpenses(
	ctx: WithdrawalContext,
	draft: { startMode: string; milestone: string; start: string },
	ownId: string,
): ScenarioFlow[] {
	if (draft.startMode !== "milestone" || draft.milestone === "") return []
	const date = startDateOf(ctx, draft)
	return ctx.doc.flows.filter((flow) => {
		if (flow.kind !== "expense" || flow.id === ownId || ruleOf(flow) !== null) return false
		if (flow.endAt === draft.milestone) return true
		return flow.endAt === undefined && stillRunning(flow, date)
	})
}

/** Whether a Flow with no Milestone end has anything left to stop on `date`: not a one-off paid before it, not ended before it. */
function stillRunning(flow: ScenarioFlow, date: string | null): boolean {
	if (date === null) return true
	if (flow.frequency === "once") return flow.start >= date
	return flow.end === undefined || flow.end >= date
}
