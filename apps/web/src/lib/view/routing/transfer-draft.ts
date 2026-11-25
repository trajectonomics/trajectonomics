/** A transfer as the drawer states it: from, to, how much, how often, when, and whether a gain counts for tax. */
import type { ScenarioFlow } from "../../contract"
import { formatBps } from "../../format"
import type { DateChoice } from "../estate/dates"
import type { GrowthKind } from "./targets"
import { movesOf } from "./transfer-read"

export type Amount = "all" | "share" | "amount"
export type When = "date" | "milestone" | "anchor"

export interface TransferDraft {
	source: string
	target: string
	how: Amount
	amount: string
	/** How an amount grows: not at all, with inflation, or by a fixed percent a year. */
	growth: GrowthKind
	/** The percent a year of a fixed growth, as typed. */
	rate: string
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

/** A stored growth as a draft: no growth (a rate of 0, or none), inflation, or a fixed percent a year. */
function growthDraft(growth: ScenarioFlow["growth"]): { growth: GrowthKind; rate: string } {
	if (growth === "inflation") return { growth: "inflation", rate: "" }
	if (growth === undefined || growth.bps === 0) return { growth: "none", rate: "" }
	return { growth: "fixed", rate: formatBps(growth.bps) }
}

/** The fields that say how much a stored transfer moves. */
function amountDraft(
	flow: ScenarioFlow | undefined,
): Pick<TransferDraft, "how" | "amount" | "growth" | "rate" | "share"> {
	const moves = flow === undefined ? null : movesOf(flow)
	return {
		how: moves?.how ?? (flow === undefined ? "all" : "amount"),
		amount: flow?.amount ?? "",
		...growthDraft(flow?.growth),
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
