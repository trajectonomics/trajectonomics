/**
 * What the Estate page shows of one date: the CLI's row and lines, in the order a person reads them. Every amount is
 * the CLI's text; `real` is set only where the engine states a figure in today's money, which is the net estate and
 * what heirs receive (cli ADR 0064). No line is added up here: the totals are the engine's.
 */
import type { ProjectionRun } from "../../contract"
import { type EstateRow, estateRowsOf, linesOn, rowOn, shortfallOf } from "./rows"

/** One line of the breakdown: its key (the diagram's band and the table's row), its words and its amounts. */
export interface Item {
	readonly key: string
	readonly label: string
	/** The CLI's nominal amount. */
	readonly amount: string
	/** The CLI's amount in today's money, where the engine states one. */
	readonly real: string | null
	/** A part of the total above it: a cost or a gift. */
	readonly part: boolean
}

/** The estate on one date. */
export interface EstateFigures {
	readonly date: string
	readonly row: EstateRow
	readonly currency: string
	/** The shortfall (the net estate without its sign) when debts and costs are more than everything owned; heirs then receive nothing. */
	readonly shortfall: string | null
	readonly items: readonly Item[]
	/** The cost lines and the gift lines of the date, as the table's parts. */
	readonly costs: readonly Item[]
	readonly gifts: readonly Item[]
}

function lineItems(run: ProjectionRun, date: string, kind: "cost" | "gift"): Item[] {
	return linesOn(run, date)
		.filter((line) => line.kind === kind)
		.map((line) => ({
			key: `${kind}:${line.line}`,
			label: line.line,
			amount: line.amount,
			real: null,
			part: true,
		}))
}

/** The estate on the row a date reads (see `rowOn`), or null when the run states none. */
export function figuresAt(run: ProjectionRun, date: string): EstateFigures | null {
	const row = rowOn(estateRowsOf(run), date)
	if (row === null) return null
	const costs = lineItems(run, row.date, "cost")
	const gifts = lineItems(run, row.date, "gift")
	const whole = (key: string, label: string, amount: string, real: string | null = null): Item => ({
		key,
		label,
		amount,
		real,
		part: false,
	})
	return {
		date: row.date,
		row,
		currency: run.currency,
		shortfall: shortfallOf(row),
		costs,
		gifts,
		items: [
			whole("gross", "Gross estate", row.gross),
			whole("debts", "Debts", row.debts),
			whole("costs", "Settlement costs", row.costs),
			...costs,
			whole("net", "Net estate", row.net, row.realNet),
			whole("gifts", "Gifts", row.gifts),
			...gifts,
			whole("heirs", "What heirs receive", row.toHeirs, row.realToHeirs),
		],
	}
}

/** How a line is shown under the terms asked for: the amount in the main place, a tag and, beside it, today's money. */
export interface Shown {
	readonly amount: string
	/** "Today's money" or "Nominal" when the terms ask for today's money alone; the engine states only two such figures. */
	readonly tag: string | null
	/** The figure in today's money, shown beside the nominal one when both are asked for. */
	readonly aside: string | null
}

/** The line's amounts under the terms. Only a line the engine states in today's money (net, heirs) ever moves; the rest stay nominal, and say so. */
export function shownUnder(item: Item, terms: "both" | "nominal" | "real"): Shown {
	if (terms === "real") {
		return item.real === null
			? { amount: item.amount, tag: "Nominal", aside: null }
			: { amount: item.real, tag: "Today's money", aside: null }
	}
	return { amount: item.amount, tag: null, aside: terms === "both" ? item.real : null }
}
