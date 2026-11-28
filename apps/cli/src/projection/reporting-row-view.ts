import { z } from "zod"
import { CASHFLOW_TOTALS } from "./cashflow-totals-view"
import { CASHFLOW_GROUPS } from "./cashflow-view"
import { dateField, moneyField } from "./money"
import type {
	CashflowMonthRow,
	CashflowMonthTotalRow,
	CashflowMonthTransferRow,
	CashflowYearRow,
	CashflowYearTotalRow,
	CashflowYearTransferRow,
} from "./reporting-view"

/*
 * The row schemas of the six Reporting tables (cli ADR-0086): the `cashflow`, `cashflowTotals` and
 * `transfers` fields of ADR-0058 and ADR-0070 over a Reporting year or month. One object of each kind
 * is shared by the year and month rows, so the two never name a field differently.
 */

const pointFields = {
	year: z.number().int().describe("The Reporting year's number: the calendar year it begins in."),
	from: dateField("The span's first day"),
	to: dateField("The span's last day"),
	partial: z
		.boolean()
		.describe("Whether the span is cut by the As-of, the horizon or the date the money runs out."),
}

const monthField = z
	.string()
	.describe("The Reporting month, as YYYY-MM: the first seven characters of from.")

const lineFields = {
	group: z
		.enum(CASHFLOW_GROUPS)
		.describe("The line's source, as a cashflow row names it (cli ADR-0058)."),
	id: z
		.string()
		.nullable()
		.describe("The Flow, Levy or category the line names, and null for a line that names none."),
	account: z
		.string()
		.nullable()
		.describe("The Account the line moved money into or out of, and null for a line without one."),
	category: z
		.string()
		.nullable()
		.describe("The category an expense Flow declares, and null on every other line."),
	amount: moneyField("The line's amount at the Currency's scale"),
	entry: z
		.number()
		.int()
		.optional()
		.describe(
			"A drawn line's position in cashflow.withdraw, present only when the list declares a Reserve floor.",
		),
}

const totalFields = {
	total: z
		.enum(CASHFLOW_TOTALS)
		.describe(
			"The section, in the order money in, tax, withdrawals, drawn, spending, saving, not funded, left over and unmet.",
		),
	amount: moneyField(
		"The section's total at the Currency's scale; a span with no line states 0.00",
	),
}

const transferFields = {
	flow: z.string().describe("The transfer Flow's id, as the Scenario spells it."),
	source: z.string().describe("The Account the money left, as the Scenario spells its id."),
	target: z
		.string()
		.describe("The Account the money went into: an asset, or a liability it paid down."),
	amount: moneyField("What moved in the span"),
	unmoved: moneyField("What the Flow planned and did not move in the span"),
}

/** The span fields of a month row: its year, its month, then the days it covers. */
const monthPointFields = {
	year: pointFields.year,
	month: monthField,
	from: pointFields.from,
	to: pointFields.to,
	partial: pointFields.partial,
}

export const cashflowYearRow: z.ZodType<CashflowYearRow> = z.strictObject({
	...pointFields,
	...lineFields,
})

export const cashflowMonthRow: z.ZodType<CashflowMonthRow> = z.strictObject({
	...monthPointFields,
	...lineFields,
})

export const cashflowYearTotalRow: z.ZodType<CashflowYearTotalRow> = z.strictObject({
	...pointFields,
	...totalFields,
})

export const cashflowMonthTotalRow: z.ZodType<CashflowMonthTotalRow> = z.strictObject({
	...monthPointFields,
	...totalFields,
})

export const cashflowYearTransferRow: z.ZodType<CashflowYearTransferRow> = z.strictObject({
	...pointFields,
	...transferFields,
})

export const cashflowMonthTransferRow: z.ZodType<CashflowMonthTransferRow> = z.strictObject({
	...monthPointFields,
	...transferFields,
})
