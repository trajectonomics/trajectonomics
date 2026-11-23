import type { ProjectionRun } from "../../contract"
import type { ReportTable } from "./table"
import { annual, monthly } from "./table-annual"
import { balances, milestones, paidOff, spendingRules, taxYears } from "./table-balances"
import { estate, estateLines } from "./table-estate"
import { cashflow, cashflowTotals, liabilities } from "./table-flows"

/** The table of one projection table, as the CLI named it. */
function tableOf(table: ProjectionRun["tables"][number]): ReportTable {
	switch (table.name) {
		case "annual":
			return annual(table.rows)
		case "monthly":
			return monthly(table.rows)
		case "cashflow":
			return cashflow(table.rows)
		case "cashflowTotals":
			return cashflowTotals(table.rows)
		case "liabilities":
			return liabilities(table.rows)
		case "paidOff":
			return paidOff(table.rows)
		case "balances":
			return balances(table.rows)
		case "spendingRules":
			return spendingRules(table.rows)
		case "estate":
			return estate(table.rows)
		case "estateLines":
			return estateLines(table.rows)
		case "milestones":
			return milestones(table.rows)
	}
}

/**
 * Every table a projection run holds, in the order the run gives them, then the tax years when the run has any.
 * A table with no rows is kept, so the page shows that the CLI stated none.
 */
export function reportTables(run: ProjectionRun): ReportTable[] {
	const tables = run.tables.map(tableOf)
	if (run.taxYears.length > 0) tables.push(taxYears(run.taxYears))
	return tables
}
