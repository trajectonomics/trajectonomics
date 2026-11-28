import type { CompareSide, ProjectionCompare } from "../../contract"
import { formatMonth } from "../../format"
import type { ChartState } from "./chart"
import { type FocusLine, type FocusLineSpec, focusLines } from "./focus-lines"

/** The plan that lets the person stop soonest, as the focus point answers with it. */
export interface CompareWinner {
	readonly name: string
	readonly month: string
}

/** The Compare page's focus point: both plans' lines, the plan that stops soonest, and the stated gap. */
export interface CompareFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	readonly tone: "plain" | "warn"
	readonly winner: CompareWinner | null
	/** The CLI's whole months between the plans, absolute, stated only when both reach and the compare says so. */
	readonly gap: number | null
	readonly lines: readonly [FocusLine, FocusLine]
	/** The one primary action: the winner's own Plan page; none without a winner. */
	readonly action: { readonly label: string; readonly href: string } | null
}

/** The winning side of a compare, by its place among the two and its FI date. */
interface Won {
	readonly index: 0 | 1
	readonly date: string
}

const QUESTION = "Which plan lets you stop soonest?"

/** The Plan page of one plan, the same address a plan card opens, so the hosted Demo keeps its base path. */
function planHref(name: string): string {
	return `/projection/?scenario=${encodeURIComponent(name)}`
}

/** The earliest reachable FI date, compared as text; a tie goes to A, and none is reachable without a winner. */
function winnerOf(data: ProjectionCompare): Won | null {
	const { a, b } = data.sides
	if (a.fi.reachable && (!b.fi.reachable || a.fi.fiDate <= b.fi.fiDate)) {
		return { index: 0, date: a.fi.fiDate }
	}
	if (b.fi.reachable) return { index: 1, date: b.fi.fiDate }
	return null
}

/** The CLI's stated gap, absolute, only when both plans reach and the gap is real: the page never works one out. */
function gapOf(data: ProjectionCompare, won: Won | null): number | null {
	const stated = data.deltas.fiMonths
	if (won === null || stated === null || Math.abs(stated) === 0) return null
	if (!data.sides.a.fi.reachable || !data.sides.b.fi.reachable) return null
	return Math.abs(stated)
}

/** The question and the answer, plus the stated gap, for the sr-only heading. */
function labelOf(data: ProjectionCompare, won: Won | null, gap: number | null): string {
	const names = [data.sides.a.scenario.name, data.sides.b.scenario.name] as const
	if (won === null) {
		return `${QUESTION} Neither plan reaches financial independence by ${formatMonth(data.horizon)}.`
	}
	const other = names[(1 - won.index) as 0 | 1]
	const months =
		gap === null ? "" : ` ${gap} ${gap === 1 ? "month" : "months"} sooner than ${other}.`
	return `${QUESTION} ${names[won.index]}, in ${formatMonth(won.date)}.${months}`
}

/** The FI date of a side, or null when it does not reach one. */
function fiDateOf(side: CompareSide): string | null {
	return side.fi.reachable ? side.fi.fiDate : null
}

/**
 * The focus point of one comparison: the two net-worth lines, each reachable plan's FI date dotted, and the plan
 * that lets the person stop soonest. Null when the chart cannot be drawn, which is the page's own empty state.
 */
export function compareFocusView(data: ProjectionCompare, chart: ChartState): CompareFocus | null {
	if (chart.kind !== "chart") return null
	const [a, b] = chart.series
	if (a === undefined || b === undefined) return null
	const won = winnerOf(data)
	const gap = gapOf(data, won)
	const names = [data.sides.a.scenario.name, data.sides.b.scenario.name] as const
	const specs: readonly [FocusLineSpec, FocusLineSpec] = [
		{
			key: "a",
			name: a.name,
			points: a.points,
			accent: won?.index === 0,
			dotDate: fiDateOf(data.sides.a),
		},
		{
			key: "b",
			name: b.name,
			points: b.points,
			accent: won?.index === 1,
			dotDate: fiDateOf(data.sides.b),
		},
	]
	return {
		label: labelOf(data, won, gap),
		tone: won === null ? "warn" : "plain",
		winner: won === null ? null : { name: names[won.index], month: formatMonth(won.date) },
		gap,
		lines: focusLines(specs),
		action: won === null ? null : { label: "Open this plan", href: planHref(names[won.index]) },
	}
}
