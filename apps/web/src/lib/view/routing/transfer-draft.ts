/** A transfer as the drawer states it: from, to, how much, how often, when, and whether a gain counts for tax. */
import type { ScenarioFlow } from "../../contract"
import type { DateChoice } from "../estate/dates"
import { movesOf } from "./transfer-read"

export type Amount = "all" | "share" | "amount"
export type When = "date" | "milestone" | "anchor"

export interface TransferDraft {
	source: string
	target: string
	how: Amount
	amount: string
	/** An amount that keeps its value in today's money grows with inflation; otherwise it stays as typed. */
	real: boolean
	share: string
	frequency: string
	when: When
	date: string
	milestone: string
	anchor: string
	end: string
	realise: boolean
}

/** What the drawer is made against: the plan's Milestones and the dates its household names. */
export interface TransferContext {
	readonly milestones: readonly string[]
	readonly anchors: readonly DateChoice[]
	readonly asOf: string
}

/** Where a stored transfer starts from: a Milestone, a date the household names, or a date. */
function whenOf(flow: ScenarioFlow | undefined, anchor: DateChoice | undefined): When {
	if (flow?.startAt !== undefined) return "milestone"
	return anchor === undefined ? "date" : "anchor"
}

/** The fields that say how much a stored transfer moves. */
function amountDraft(
	flow: ScenarioFlow | undefined,
): Pick<TransferDraft, "how" | "amount" | "real" | "share"> {
	const moves = flow === undefined ? null : movesOf(flow)
	return {
		how: moves?.how ?? (flow === undefined ? "all" : "amount"),
		amount: flow?.amount ?? "",
		real: flow?.growth === "inflation",
		share: moves?.how === "share" ? moves.share : "",
	}
}

/** The fields that say when a stored transfer starts. */
function whenDraft(
	flow: ScenarioFlow | undefined,
	ctx: TransferContext,
): Pick<TransferDraft, "when" | "date" | "milestone" | "anchor"> {
	const anchor =
		flow?.startAt === undefined ? ctx.anchors.find((one) => one.date === flow?.start) : undefined
	const when = whenOf(flow, anchor)
	return {
		when,
		date: when === "date" ? (flow?.start ?? "") : "",
		milestone: flow?.startAt ?? "",
		anchor: anchor?.value ?? "",
	}
}

/** The draft of a stored transfer, or a blank one that moves everything once, on no date yet. */
export function transferDraftOf(
	flow: ScenarioFlow | undefined,
	ctx: TransferContext,
): TransferDraft {
	return {
		source: flow?.source ?? "",
		target: flow?.target ?? "",
		frequency: flow?.frequency ?? "once",
		end: flow?.end ?? "",
		realise: flow?.realise === true,
		...amountDraft(flow),
		...whenDraft(flow, ctx),
	}
}
