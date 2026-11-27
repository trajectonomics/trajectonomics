import type { ScenarioFlow } from "../../contract/scenario-show"
import { formatBps } from "../../format/bps"

export {
	type FlowCard,
	type FlowKind,
	flowCards,
	growthText,
	isComputed,
} from "./flow-card"

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
	/** The name a page reads in place of the id, free text: empty for none (sim ADR 0032). */
	readonly displayLabel: string
}

/** The name a page reads in place of a Flow's id, or empty when it states none. */
function draftLabel(flow?: ScenarioFlow): string {
	return flow?.displayLabel ?? ""
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
		displayLabel: draftLabel(flow),
	}
}

/** The categories the expenses of a plan use, each once, in the order the document first names them. */
export function categoriesOf(flows: readonly ScenarioFlow[]): string[] {
	const names = flows.flatMap((flow) =>
		flow.kind === "expense" && flow.category !== undefined ? [flow.category] : [],
	)
	return [...new Set(names)]
}
