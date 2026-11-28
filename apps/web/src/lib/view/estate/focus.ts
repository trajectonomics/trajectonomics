import { shares, toChartNumber } from "../../chart"
import { formatCompact, yearOf } from "../../format"
import type { Terms } from "../projection/terms"
import type { EstateFigures } from "./figures"

/** One slice of the estate bar: a deduction, or the net amount the heirs receive at its end. */
export interface EstateSegment {
	readonly share: number
	readonly heirs: boolean
	/** The short name under the bar: "debts", "costs", "gifts" or "heirs". */
	readonly name: string
}

/** The Estate page's focus point: the gross estate walked through its deductions to what heirs receive. */
export interface EstateFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	/** What heirs receive, the CLI's exact string, written compact and masked by Hide amounts. */
	readonly net: string
	readonly currency: string
	/** The estate's year, as a small tick under the bar: "2027". */
	readonly year: string
	/** True when the answer and one full bar are in today's money, and no deduction is drawn. */
	readonly real: boolean
	readonly segments: readonly EstateSegment[]
	/** True when the gross estate is nothing, so the bar is a thin baseline rather than a blank. */
	readonly emptyBar: boolean
}

/** The names under the bar, in the order of its slices. */
const SEGMENT_NAMES = ["debts", "costs", "gifts", "heirs"] as const

/**
 * The focus point of the estate on the date the page reads, under the terms asked for. Null when the estate is
 * short (the page's own alert says so) or a line is negative, so the bar never draws a slice it cannot place.
 * The shares are the CLI's amounts placed for drawing only (web ADR 0002).
 */
export function estateFocusView(
	figures: EstateFigures,
	terms: Terms,
	hidden: boolean,
): EstateFocus | null {
	if (figures.shortfall !== null) return null
	const row = figures.row
	const values = [row.debts, row.costs, row.gifts, row.toHeirs].map(toChartNumber)
	if (values.some((value) => value < 0)) return null
	const weights = shares(values)
	const year = yearOf(row.date)
	const real = terms === "real"
	const net = real ? row.realToHeirs : row.toHeirs
	const tail = real ? "in today's money" : `in ${year}`
	const label = hidden
		? `What would your heirs receive? The amount is hidden. In ${real ? "today's money" : year}.`
		: `What would your heirs receive? ${formatCompact(net)} ${figures.currency} ${tail}.`
	const segments = weights.map((share, index) => ({
		share,
		heirs: index === weights.length - 1,
		name: SEGMENT_NAMES[index] ?? "heirs",
	}))
	const empty = real
		? toChartNumber(net) === 0
		: values.reduce((sum, value) => sum + value, 0) === 0
	return {
		label,
		net,
		currency: figures.currency,
		year,
		real,
		segments: real ? [{ share: 1, heirs: true, name: "heirs" }] : segments,
		emptyBar: empty,
	}
}
