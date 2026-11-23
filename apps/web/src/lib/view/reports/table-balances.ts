import type { TaxYear } from "../../contract"
import type { ReportTable } from "./table"
import { build, figure, optional, type Rows, type Spec, text } from "./table-fields"

export function paidOff(rows: Rows<"paidOff">): ReportTable {
	type Row = Rows<"paidOff">[number]
	return build(
		"paidOff",
		"Paid off",
		[text("account", (r: Row) => r.account), text("date", (r: Row) => r.date)],
		rows,
	)
}

export function balances(rows: Rows<"balances">): ReportTable {
	type Row = Rows<"balances">[number]
	return build(
		"balances",
		"Account balances",
		[
			text("date", (r: Row) => r.date),
			text("account", (r: Row) => r.account),
			figure("amount", (r: Row) => r.amount),
			figure("real", (r: Row) => r.real),
		],
		rows,
	)
}

export function milestones(rows: Rows<"milestones">): ReportTable {
	type Row = Rows<"milestones">[number]
	return build(
		"milestones",
		"Milestones",
		[
			text("id", (r: Row) => r.id),
			text("reached", (r: Row) => r.reached),
			text("date", (r: Row) => r.date),
		],
		rows,
	)
}

export function taxYears(rows: readonly TaxYear[]): ReportTable {
	const specs: Spec<TaxYear>[] = [
		text("levy", (r: TaxYear) => r.levy),
		text("from", (r: TaxYear) => r.from),
		text("to", (r: TaxYear) => r.to),
		text("settlementDate", (r: TaxYear) => r.settlementDate),
		figure("due", (r: TaxYear) => r.due),
		figure("prepaid", (r: TaxYear) => r.prepaid),
		figure("owed", (r: TaxYear) => r.owed),
		text("settled", (r: TaxYear) => r.settled),
		text("partial", (r: TaxYear) => r.partial),
		...optional(
			rows,
			figure("taxableIncome", (r: TaxYear) => r.taxableIncome),
		),
		...optional(
			rows,
			figure("progressiveTax", (r: TaxYear) => r.progressiveTax),
		),
	]
	return build("taxYears", "Tax years", specs, rows)
}
