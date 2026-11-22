import type { HouseholdDocument } from "../../contract"
import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"
import { flowAnchorLabels } from "../household/model"

/** The kinds of Flow a planner page lists: Income lists `income`, Expenses lists `expense`. */
export type FlowKind = "income" | "expense"

/** The frequencies a Flow may take, in the order the form offers them. */
export const FREQUENCIES = [
	"once",
	"daily",
	"weekly",
	"biweekly",
	"monthly",
	"quarterly",
	"annual",
] as const

/** One Flow as a card: every figure is the CLI's text. A computed amount has none, so it reads "computed". */
export interface FlowCard {
	readonly id: string
	/** The amount per occurrence, as the CLI's decimal string; null for a Flow whose amount is computed. */
	readonly amount: string | null
	readonly frequency: string
	readonly start: string
	readonly end: string
	/** The label of the start when the household pins it ("at me, age 60"), or null. */
	readonly startAnchor: string | null
	/** The label of the end when the household pins it, or null. */
	readonly endAnchor: string | null
	readonly growth: string
	/** "Earned" or "Passive" for an income Flow; null for an expense. */
	readonly earned: string | null
	/** False for a computed Flow, which the forms do not edit. */
	readonly editable: boolean
}

/** The growth of a Flow as the card shows it: inflation, or a percent a year moved from the basis points. */
function growthText(flow: ScenarioFlow): string {
	const growth = flow.growth
	if (growth === undefined) return "No growth stated"
	if (growth === "inflation") return "Follows inflation"
	return `${formatBps(growth.bps)}% a year`
}

/** The anchor labels of one Flow's dates, as the card holds them. */
function anchorsOf(household: HouseholdDocument | null, id: string) {
	const labels = flowAnchorLabels(household, id)
	return { startAnchor: labels.start, endAnchor: labels.end }
}

/** The Flows of one kind as cards, in the order the document holds them, each with its anchors' labels. */
export function flowCards(
	flows: readonly ScenarioFlow[],
	kind: FlowKind,
	household: HouseholdDocument | null = null,
): FlowCard[] {
	return flows
		.filter((flow) => flow.kind === kind)
		.map((flow) => ({
			id: flow.id,
			amount: flow.amount ?? null,
			frequency: flow.frequency,
			start: flow.start,
			end: flow.end ?? "To the horizon",
			...anchorsOf(household, flow.id),
			growth: flow.derive === undefined ? growthText(flow) : "Computed",
			earned:
				kind !== "income" || flow.earned === undefined ? null : flow.earned ? "Earned" : "Passive",
			editable: flow.derive === undefined,
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
	}
}
