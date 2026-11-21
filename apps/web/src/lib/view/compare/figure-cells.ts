import type { CompareSide, FiResult, ProjectionCompare } from "../../contract"
import { formatDate, formatMonth } from "../../format"
import { type Cell, moneyCell, textCell } from "./cell"

/** The FI date of one side: its month, or the word it is not reachable, with the binding it names. */
export function fiCell(fi: FiResult): Cell {
	if (fi.reachable) return textCell(formatMonth(fi.fiDate))
	return textCell("Not reachable", `Binding: ${fi.binding}`)
}

/** Why the FI difference is not stated: one side or both cannot reach an FI date. */
export function fiReason(data: ProjectionCompare): string {
	const reachable = [data.sides.a.fi, data.sides.b.fi].filter((fi) => fi.reachable).length
	return reachable === 0 ? "Neither FI date is reachable" : "One FI date is not reachable"
}

/** Net worth at the end of one side, with the month the Projection ends on. */
export function endCell(side: CompareSide, terms: "nominal" | "real"): Cell {
	const final = side.netWorth.final
	return moneyCell(final[terms], `At ${formatDate(final.date)}`)
}

/** Why the net worth difference at the end is not stated: the two end on different dates. */
export const END_REASON = "The two Projections end on different dates"

/** The month a side runs out of money, or the words for a side that does not. */
export function runOutCell(side: CompareSide): Cell {
	if (side.runOut === null) return textCell("Not within the horizon")
	return textCell(formatMonth(side.runOut.date))
}

/** Why the run-out difference is not stated: only one side runs out, or neither does. */
export function runOutReason(data: ProjectionCompare): string {
	const runs = [data.sides.a.runOut, data.sides.b.runOut].filter((run) => run !== null).length
	return runs === 0 ? "Neither Projection runs out" : "Only one Projection runs out"
}

/** Net worth at an age on one side, or the word for an age the side does not reach. */
export function ageCell(amount: string | null | undefined): Cell {
	if (amount === null || amount === undefined) return textCell("Not reached")
	return moneyCell(amount)
}

/** Why an age's difference is not stated: one of the two Projections does not reach that age. */
export const AGE_REASON = "One Projection does not reach this age"
