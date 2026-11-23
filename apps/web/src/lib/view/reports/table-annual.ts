import type { ReportTable } from "./table"
import { ageSpecs, build, figure, optional, type Rows, text } from "./table-fields"

export function annual(rows: Rows<"annual">): ReportTable {
	return build(
		"annual",
		"Yearly rows",
		[
			figure("index", (r: Rows<"annual">[number]) => r.index),
			text("from", (r: Rows<"annual">[number]) => r.from),
			text("to", (r: Rows<"annual">[number]) => r.to),
			...ageSpecs(rows),
			figure("openingNetWorth", (r: Rows<"annual">[number]) => r.openingNetWorth),
			figure("closingNetWorth", (r: Rows<"annual">[number]) => r.closingNetWorth),
			figure("income", (r: Rows<"annual">[number]) => r.income),
			...optional(
				rows,
				figure("withdrawals", (r: Rows<"annual">[number]) => r.withdrawals),
			),
			figure("expense", (r: Rows<"annual">[number]) => r.expense),
			figure("contributions", (r: Rows<"annual">[number]) => r.contributions),
			figure("unfundedContributions", (r: Rows<"annual">[number]) => r.unfundedContributions),
			figure("interest", (r: Rows<"annual">[number]) => r.interest),
			figure("unmet", (r: Rows<"annual">[number]) => r.unmet),
			text("partial", (r: Rows<"annual">[number]) => r.partial),
			text("realNetWorth.date", (r: Rows<"annual">[number]) => r.realNetWorth.date),
			figure("realNetWorth.amount", (r: Rows<"annual">[number]) => r.realNetWorth.amount),
		],
		rows,
	)
}

export function monthly(rows: Rows<"monthly">): ReportTable {
	type Row = Rows<"monthly">[number]
	return build(
		"monthly",
		"Monthly rows",
		[
			text("date", (r: Row) => r.date),
			...ageSpecs(rows),
			figure("netWorth", (r: Row) => r.netWorth),
			figure("realNetWorth", (r: Row) => r.realNetWorth),
			figure("accessibleNetWorth", (r: Row) => r.accessibleNetWorth),
			figure("realAccessibleNetWorth", (r: Row) => r.realAccessibleNetWorth),
		],
		rows,
	)
}
