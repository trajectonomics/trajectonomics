import type { HouseholdDocument } from "../../contract"
import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"
import { type AccountNames, NO_NAMES } from "../account-names"
import { ruleSummary } from "../withdrawals/words"
import { employerText } from "./employer"
import { datesOfCard } from "./flow-dates"

/** The kinds of Flow a planner page lists: Income lists `income`, Expenses lists `expense`. */
export type FlowKind = "income" | "expense"

/** One Flow as a card: every figure is the CLI's text. A computed amount has none, so it reads "computed". */
export interface FlowCard {
	readonly id: string
	/** The amount per occurrence, as the CLI's decimal string; null for a Flow whose amount is computed. */
	readonly amount: string | null
	readonly frequency: string
	/** "On" for a once Flow, whose one occurrence is its date; "Starts" for any other. */
	readonly startLabel: string
	readonly start: string
	/** The end as the card states it, or null for a once Flow, which has no end. */
	readonly end: string | null
	/** The label of the start when the household pins it ("at me, age 60"), or null. */
	readonly startAnchor: string | null
	/** The label of the end when the household pins it, or null (also for a once Flow). */
	readonly endAnchor: string | null
	readonly growth: string
	/** "Earned" or "Passive" for an income Flow; null for an expense. */
	readonly earned: string | null
	/** An expense's category as the document states it, or null when it has none (or is not an expense). */
	readonly category: string | null
	/** "Employer adds 5% to Provident fund" for a salary whose employer pays into an Account; null for any other Flow. */
	readonly employer: string | null
	/** False for a computed Flow, which the forms do not edit. */
	readonly editable: boolean
}

/** Whether a Flow's amount is computed, so it has no amount the form could edit: a derived, a level or a spending-rule one. */
export function isComputed(flow: ScenarioFlow): boolean {
	return flow.derive !== undefined || flow.level !== undefined || flow.rule !== undefined
}

/** The growth of a Flow as the card shows it: inflation, or a percent a year moved from the basis points. */
export function growthText(flow: ScenarioFlow): string {
	const growth = flow.growth
	if (growth === undefined) return "No growth stated"
	if (growth === "inflation") return "Follows inflation"
	return `${formatBps(growth.bps)}% a year`
}

/** "Earned" or "Passive" for an income Flow that states it; null for any other. */
function earnedOf(flow: ScenarioFlow, kind: FlowKind): string | null {
	if (kind !== "income" || flow.earned === undefined) return null
	return flow.earned ? "Earned" : "Passive"
}

/**
 * The Flows of one kind as cards, in the order the document holds them, each with its anchors' labels. `all` is every Flow of
 * the plan, where a salary's employer Flow is found (it is a contribution, so it is no card of its own).
 */
export function flowCards(
	flows: readonly ScenarioFlow[],
	kind: FlowKind,
	household: HouseholdDocument | null = null,
	all: readonly ScenarioFlow[] = flows,
	names: AccountNames = NO_NAMES,
): FlowCard[] {
	return flows
		.filter((flow) => flow.kind === kind)
		.map((flow) => ({
			id: flow.id,
			amount: flow.amount ?? null,
			frequency: flow.frequency,
			...datesOfCard(flow, household),
			growth: isComputed(flow) ? (ruleSummary(flow) ?? "Computed") : growthText(flow),
			earned: earnedOf(flow, kind),
			category: kind === "expense" ? (flow.category ?? null) : null,
			employer: employerText(all, flow, kind, names),
			// A form edits a fixed amount only: a computed Flow has none to show, so it is read-only.
			editable: !isComputed(flow) && flow.amount !== undefined,
		}))
}

/** The form's text for one Flow. A new Flow starts monthly, follows inflation and is earned. */
export interface FlowDraft {
	readonly name: string
	readonly frequency: string
	readonly start: string
	readonly end: string
	readonly amount: string
	/** "inflation", or "fixed" for the percent in `rate`. Text, so a form can bind it. */
	readonly growth: string
	readonly rate: string
	readonly earned: boolean
	/** An expense's group for reports, free text: empty for none. Suggested from the categories the plan holds. */
	readonly category: string
}

/** The draft of a Flow to edit, or of a new one when there is no Flow. */
export function flowDraftOf(flow?: ScenarioFlow): FlowDraft {
	const growth = flow?.growth
	const fixed = growth !== undefined && growth !== "inflation"
	return {
		name: flow?.id ?? "",
		frequency: flow?.frequency ?? "monthly",
		start: flow?.start ?? "",
		end: flow?.end ?? "",
		amount: flow?.amount ?? "",
		growth: fixed ? "fixed" : "inflation",
		rate: growth !== undefined && growth !== "inflation" ? formatBps(growth.bps) : "",
		earned: flow?.earned !== false,
		category: flow?.category ?? "",
	}
}

/** The categories the expenses of a plan use, each once, in the order the document first names them. */
export function categoriesOf(flows: readonly ScenarioFlow[]): string[] {
	const names = flows.flatMap((flow) =>
		flow.kind === "expense" && flow.category !== undefined ? [flow.category] : [],
	)
	return [...new Set(names)]
}
