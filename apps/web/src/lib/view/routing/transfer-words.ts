/** A transfer in a sentence: "Move all of Provident fund to RMF on 30 Jun 2031", "Move 10% of Savings to Fixed deposit every year". */
import type { ScenarioFlow } from "../../contract"
import { formatDate, percentWords } from "../../format"
import { nameOf } from "./accounts"
import { movesOf } from "./transfer-read"
import type { Part } from "./words"

const EVERY: Readonly<Record<string, string>> = {
	daily: "every day",
	weekly: "every week",
	biweekly: "every two weeks",
	monthly: "every month",
	quarterly: "every quarter",
	annual: "every year",
}

/** When the transfer lands: its date, or the Milestone that fires it, with its frequency. */
function whenWords(flow: ScenarioFlow): string {
	const at = flow.startAt === undefined ? formatDate(flow.start) : `when ${flow.startAt} fires`
	const every = EVERY[flow.frequency]
	if (every === undefined) return flow.startAt === undefined ? `on ${at}` : at
	return flow.startAt === undefined && flow.start === "" ? every : `${every}, from ${at}`
}

/** The transfer's sentence as parts, with its amount drawn by the page. */
export function transferWords(flow: ScenarioFlow, names: ReadonlyMap<string, string>): Part[] {
	const from = nameOf(names, flow.source ?? "")
	const to = nameOf(names, flow.target ?? "")
	const moves = movesOf(flow)
	const when = ` ${whenWords(flow)}`
	if (moves === null) return [`Move money from ${from} to ${to} by a computed amount${when}`]
	if (moves.how === "all") return [`Move all of ${from} to ${to}${when}`]
	if (moves.how === "share")
		return [`Move ${percentWords(moves.share)}% of ${from} to ${to}${when}`]
	const real = flow.growth === "inflation" ? " in today's money" : ""
	return ["Move ", { amount: flow.amount ?? "" }, `${real} from ${from} to ${to}${when}`]
}
