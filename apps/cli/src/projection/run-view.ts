import { z } from "zod"
import { type BalancesTable, balancesTable, type FeesTable, feesTable } from "./balances-view"
import { carryInField } from "./carryin-view"
import { type CashflowTotalsTable, cashflowTotalsTable } from "./cashflow-totals-view"
import { type CashflowRow, cashflowRow } from "./cashflow-view"
import { type EstateTables, estateTables } from "./estate-view"
import {
	type LiabilityMonthsTable,
	liabilityMonthsTable,
	type PaidOffTable,
	paidOffTable,
} from "./liabilities-view"
import { type MilestonesTable, milestonesTable } from "./milestones-table"
import { dateField } from "./money"
import { type AnnualRow, annualRow, type MonthlyRow, monthlyRow } from "./rows-view"
import { type SpendingRulesTable, spendingRulesTable } from "./spending-view"
import { type TaxYearView, taxYearsField } from "./tax-view"
import {
	asOfField,
	type Echo,
	engineEcho,
	notesField,
	overrideFields,
	type RunsOutView,
	runsOut,
	scenarioEcho,
	taxField,
} from "./view"

export type { AnnualRow, MonthlyRow } from "./rows-view"
export type { TaxYearView } from "./tax-view"

/**
 * The Projection's annual roll-up, its monthly rows with `--monthly`, its cash flow with `--breakdown`
 * (cli ADR-0058), its loans with `--liabilities` (cli ADR-0059), each Account's value with `--accounts` (cli ADR-0060), each spending rule's years with `--spending` (cli ADR-0063), the estate with `--estate` (cli ADR-0064) and its milestones (cli ADR-0049).
 */
export type ProjectionTable =
	| { name: "annual"; count: number; rows: AnnualRow[] }
	| { name: "monthly"; count: number; rows: MonthlyRow[] }
	| { name: "cashflow"; count: number; rows: CashflowRow[] }
	| CashflowTotalsTable
	| LiabilityMonthsTable
	| PaidOffTable
	| BalancesTable
	| FeesTable
	| SpendingRulesTable
	| EstateTables
	| MilestonesTable

/** `traj projection run`: the Projection plus the echo block (ADR-0030). */
export type ProjectionRunView = Echo & {
	horizon: string
	currency: string
	runsOut: RunsOutView | null
	taxYears: TaxYearView[]
	tables: ProjectionTable[]
}

export const projectionTable: z.ZodType<ProjectionTable> = z.union([
	z.strictObject({
		name: z.literal("annual").describe("The engine's annual roll-up."),
		count: z.number().int().describe("The number of roll-up rows."),
		rows: z.array(annualRow).describe("One row per year, in order."),
	}),
	z.strictObject({
		name: z.literal("monthly").describe("The monthly rows, present only with --monthly."),
		count: z.number().int().describe("The number of monthly rows."),
		rows: z.array(monthlyRow).describe("One row per month, in order."),
	}),
	z.strictObject({
		name: z
			.literal("cashflow")
			.describe("Each Annual roll-up's cash flow by line, present only with --breakdown."),
		count: z.number().int().describe("The number of cash-flow rows."),
		rows: z
			.array(cashflowRow)
			.describe(
				"One row per Annual roll-up and line, roll-up by roll-up in the engine's order. A line is a source (income, prepaid, settlement, expense, category, contribution, unfunded, withdrawal, drawn, surplus or unmet) and carries its id, account and category where it has them. Amounts are decimal strings at the Currency's scale, and a settlement keeps its sign. The section totals are in cashflowTotals.",
			),
	}),
	cashflowTotalsTable,
	liabilityMonthsTable,
	paidOffTable,
	balancesTable,
	feesTable,
	spendingRulesTable,
	...estateTables,
	milestonesTable,
])

export const projectionRunView: z.ZodType<ProjectionRunView> = z.strictObject({
	asOf: asOfField,
	engine: engineEcho,
	scenario: scenarioEcho,
	...overrideFields,
	tax: taxField,
	carryIn: carryInField,
	notes: notesField,
	horizon: dateField("The date the Projection ends at"),
	currency: z.string().describe("The Scenario's ISO 4217 currency; v1 is THB only."),
	runsOut: runsOut
		.nullable()
		.describe("The month the Projection ran out of money, or null when it never does."),
	taxYears: taxYearsField,
	tables: z
		.array(projectionTable)
		.describe(
			"The annual roll-up, the monthly rows when --monthly was given, the cash flow and its section totals when --breakdown was given, the loans when --liabilities was given, each Account's value when --accounts was given, what each spending rule paid when --spending was given, what the plan would leave and each cost and gift when --estate was given, what each fee Account was charged when an Account carries a fee, and the milestones when the Scenario declares them.",
		),
})
