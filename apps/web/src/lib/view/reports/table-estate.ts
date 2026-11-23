import type { ReportTable } from "./table"
import { build, figure, type Rows, text } from "./table-fields"

/** What the plan would leave on each date (cli ADR-0064): the gross estate, the debts, the costs, the gifts and what heirs receive. */
export function estate(rows: Rows<"estate">): ReportTable {
	type Row = Rows<"estate">[number]
	return build(
		"estate",
		"Estate",
		[
			text("date", (r: Row) => r.date),
			figure("gross", (r: Row) => r.gross),
			figure("debts", (r: Row) => r.debts),
			figure("costs", (r: Row) => r.costs),
			figure("net", (r: Row) => r.net),
			figure("gifts", (r: Row) => r.gifts),
			figure("toHeirs", (r: Row) => r.toHeirs),
			figure("realNet", (r: Row) => r.realNet),
			figure("realToHeirs", (r: Row) => r.realToHeirs),
		],
		rows,
	)
}

/** Each cost and gift on each of those dates (cli ADR-0064). */
export function estateLines(rows: Rows<"estateLines">): ReportTable {
	type Row = Rows<"estateLines">[number]
	return build(
		"estateLines",
		"Estate lines",
		[
			text("date", (r: Row) => r.date),
			text("line", (r: Row) => r.line),
			text("kind", (r: Row) => r.kind),
			figure("amount", (r: Row) => r.amount),
		],
		rows,
	)
}
