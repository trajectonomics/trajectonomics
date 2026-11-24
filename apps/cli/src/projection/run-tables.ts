import type { Projection } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import { agesOn } from "../scenario/household/ages"
import { balancesTableOf } from "./balances"
import type { Placed } from "./carryin-apply"
import { cashflowRowsOf } from "./cashflow"
import { cashflowTotalRowsOf } from "./cashflow-totals"
import { estateTablesOf } from "./estate"
import { feesTableOf } from "./fees"
import { liabilityTablesOf } from "./liabilities"
import { milestoneRowsOf } from "./milestones"
import { monthlyRow } from "./rows"
import type { AnnualRow } from "./rows-view"
import type { ProjectionTable } from "./run-view"
import { spendingTableOf } from "./spending"

/** The optional outputs a run was asked for: each is a flag, and each is off by default. */
export type Wants = {
	monthly: boolean
	breakdown: boolean
	liabilities: boolean
	accounts: boolean
	spending: boolean
	estate: boolean
}

/** The cash flow's two tables (`--breakdown`, cli ADR-0058): each line, then the section totals. */
function cashflowTablesOf(
	projection: Projection,
	annual: readonly AnnualRow[],
	currency: string,
): ProjectionTable[] | AppError {
	if (projection.cashflow === undefined) {
		return fail("internal", { message: "The engine returned no cash flow for --breakdown." })
	}
	const rows = cashflowRowsOf(projection.cashflow, currency)
	const totals = cashflowTotalRowsOf(annual, rows, currency)
	if (isAppError(totals)) return totals
	return [
		{ name: "cashflow", count: rows.length, rows },
		{ name: "cashflowTotals", count: totals.length, rows: totals },
	]
}

/** The monthly rows (`--monthly`), with the ages on each date. */
function monthlyTableOf(prepared: Placed, projection: Projection): ProjectionTable {
	const rows = projection.rows.map((row) =>
		monthlyRow(row, prepared.currency, agesOn(prepared.household, row.date)),
	)
	return { name: "monthly", count: rows.length, rows }
}

/** The Milestones' fire dates, when the Scenario declares any (cli ADR-0049). */
function milestoneTablesOf(projection: Projection): ProjectionTable[] {
	if (projection.milestones === undefined) return []
	const rows = milestoneRowsOf(projection.milestones)
	return [{ name: "milestones", count: rows.length, rows }]
}

/** Each Account's value (`--accounts`, cli ADR-0060), the Accounts in the Scenario's order. */
function balancesOf(prepared: Placed, projection: Projection, monthly: boolean) {
	const order = prepared.document.accounts.map((account) => account.id)
	return balancesTableOf(projection.annual, projection.rows, monthly, order, prepared.currency)
}

/** What each fee Account was charged, when an Account carries a fee (cli ADR-0067). */
function feeTablesOf(projection: Projection, currency: string): ProjectionTable[] {
	const table = feesTableOf(projection.annual, currency)
	return table === undefined ? [] : [table]
}

/** One table, or the failure that stopped it, as the list `extraTablesOf` gathers. */
function oneTable(table: ProjectionTable | AppError): ProjectionTable[] | AppError {
	return isAppError(table) ? table : [table]
}

/**
 * The tables a run adds beyond the annual roll-up, each present only when its flag or Scenario asks for it,
 * so a run without them keeps its table list: the monthly rows (`--monthly`), the cash flow and its section
 * totals (`--breakdown`, cli ADR-0058), the loans (`--liabilities`, cli ADR-0059), each Account's value
 * (`--accounts`, cli ADR-0060), what each fee Account was charged when one carries a fee (cli ADR-0067), what each spending rule paid (`--spending`, cli ADR-0063), what the plan would leave (`--estate`, cli ADR-0064) and the milestones
 * (cli ADR-0049).
 */
export function extraTablesOf(
	prepared: Placed,
	projection: Projection,
	annual: readonly AnnualRow[],
	wants: Wants,
): ProjectionTable[] | AppError {
	const { currency } = prepared
	const asked: (ProjectionTable[] | AppError)[] = []
	if (wants.monthly) asked.push([monthlyTableOf(prepared, projection)])
	if (wants.breakdown) asked.push(cashflowTablesOf(projection, annual, currency))
	if (wants.liabilities) asked.push(liabilityTablesOf(projection.liabilities, currency))
	if (wants.accounts) asked.push(oneTable(balancesOf(prepared, projection, wants.monthly)))
	if (wants.spending) asked.push(oneTable(spendingTableOf(projection.spendingRules, currency)))
	if (wants.estate) {
		asked.push(
			estateTablesOf(
				projection.estate,
				projection.annual,
				projection.rows,
				wants.monthly,
				currency,
			),
		)
	}
	asked.push(feeTablesOf(projection, currency))
	asked.push(milestoneTablesOf(projection))
	const tables: ProjectionTable[] = []
	for (const entry of asked) {
		if (isAppError(entry)) return entry
		tables.push(...entry)
	}
	return tables
}
