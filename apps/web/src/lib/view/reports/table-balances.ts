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

/** What each fee Account was charged in each Annual roll-up (cli ADR-0067). */
export function fees(rows: Rows<"fees">): ReportTable {
	type Row = Rows<"fees">[number]
	return build(
		"fees",
		"Fees",
		[
			text("index", (r: Row) => String(r.index)),
			text("from", (r: Row) => r.from),
			text("to", (r: Row) => r.to),
			text("account", (r: Row) => r.account),
			figure("amount", (r: Row) => r.amount),
		],
		rows,
	)
}

/** What each spending rule fixed and paid in each Rule year (cli ADR-0063); the rate is stated only when the portfolio held something. */
export function spendingRules(rows: Rows<"spendingRules">): ReportTable {
	type Row = Rows<"spendingRules">[number]
	return build(
		"spendingRules",
		"Spending rules",
		[
			text("flow", (r: Row) => r.flow),
			text("date", (r: Row) => r.date),
			figure("portfolio", (r: Row) => r.portfolio),
			figure("amount", (r: Row) => r.amount),
			figure("realAmount", (r: Row) => r.realAmount),
			figure("paid", (r: Row) => r.paid),
			figure("realPaid", (r: Row) => r.realPaid),
			...optional(
				rows,
				figure("withdrawalRate", (r: Row) => r.withdrawalRate),
			),
			text("action", (r: Row) => r.action),
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
