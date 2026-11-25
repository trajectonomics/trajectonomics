import type { ReportTable } from "./table"
import { build, figure, optional, type Rows, text } from "./table-fields"

export function cashflow(rows: Rows<"cashflow">): ReportTable {
	type Row = Rows<"cashflow">[number]
	return build(
		"cashflow",
		"Cash flow",
		[
			figure("index", (r: Row) => r.index),
			text("from", (r: Row) => r.from),
			text("to", (r: Row) => r.to),
			text("group", (r: Row) => r.group),
			text("id", (r: Row) => r.id),
			text("account", (r: Row) => r.account),
			text("category", (r: Row) => r.category),
			...optional(
				rows,
				text("entry", (r: Row) => (r.entry === undefined ? undefined : String(r.entry))),
			),
			figure("amount", (r: Row) => r.amount),
		],
		rows,
	)
}

export function cashflowTotals(rows: Rows<"cashflowTotals">): ReportTable {
	type Row = Rows<"cashflowTotals">[number]
	return build(
		"cashflowTotals",
		"Cash flow totals",
		[
			figure("index", (r: Row) => r.index),
			text("from", (r: Row) => r.from),
			text("to", (r: Row) => r.to),
			text("total", (r: Row) => r.total),
			figure("amount", (r: Row) => r.amount),
		],
		rows,
	)
}

export function liabilities(rows: Rows<"liabilities">): ReportTable {
	type Row = Rows<"liabilities">[number]
	return build(
		"liabilities",
		"Loans",
		[
			text("account", (r: Row) => r.account),
			text("from", (r: Row) => r.from),
			text("to", (r: Row) => r.to),
			figure("opening", (r: Row) => r.opening),
			figure("drawn", (r: Row) => r.drawn),
			figure("paid", (r: Row) => r.paid),
			...optional(
				rows,
				figure("transferred", (r: Row) => r.transferred),
			),
			figure("interest", (r: Row) => r.interest),
			figure("closing", (r: Row) => r.closing),
			text("partial", (r: Row) => r.partial),
		],
		rows,
	)
}

/** What each transfer Flow moved between the plan's own Accounts in each Annual roll-up, and what it could not (cli ADR-0070). */
export function transfers(rows: Rows<"transfers">): ReportTable {
	type Row = Rows<"transfers">[number]
	return build(
		"transfers",
		"Transfers",
		[
			text("index", (r: Row) => String(r.index)),
			text("from", (r: Row) => r.from),
			text("to", (r: Row) => r.to),
			text("flow", (r: Row) => r.flow),
			text("source", (r: Row) => r.source),
			text("target", (r: Row) => r.target),
			figure("amount", (r: Row) => r.amount),
			figure("unmoved", (r: Row) => r.unmoved),
		],
		rows,
	)
}
