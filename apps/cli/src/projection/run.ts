import { type Projection, project } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { fail, isAppError } from "../errors"
import { agesOn } from "../scenario/household/ages"
import type { Placed } from "./carryin-apply"
import { cashflowRowsOf } from "./cashflow"
import { echoOf } from "./echo"
import { refusal } from "./engine"
import { fundingNotes } from "./funding"
import { liabilityTablesOf, optionsOf } from "./liabilities"
import { milestoneRowsOf } from "./milestones"
import { annualRow, monthlyRow, runsOutView } from "./rows"
import type { ProjectionRunView, ProjectionTable } from "./run-view"
import { taxYearsOf } from "./tax-view"
import { withdrawNotes } from "./withdraw-notes"

/**
 * `traj projection run`: the engine's Projection in the CLI's money, annual by default, with the
 * monthly rows when asked, with each roll-up's cash flow when `breakdown` is (cli ADR-0058) and with
 * each loan's statement when `liabilities` is (cli ADR-0059). It computes nothing the engine does not
 * report (ADR-0030).
 */
export function projectionOf(
	prepared: Placed,
	monthly: boolean,
	breakdown = false,
	liabilities = false,
): ProjectionRunView | AppError {
	const { timeline, baseline, currency } = prepared
	// The engine records each optional output only when asked, so a run without its flag keeps its bytes.
	const result = project(baseline, prepared.document, timeline, optionsOf(breakdown, liabilities))
	if (!result.ok) return refusal(result.problems)
	const { projection } = result
	const annual = []
	for (const rollup of projection.annual) {
		const row = annualRow(rollup, projection.rows, currency, agesOn(prepared.household, rollup.to))
		if (isAppError(row)) return row
		annual.push(row)
	}
	const tables: ProjectionTable[] = [{ name: "annual", count: annual.length, rows: annual }]
	const extra = extraTablesOf(prepared, projection, monthly, breakdown, liabilities)
	if (isAppError(extra)) return extra
	tables.push(...extra)
	return {
		...echoOf(prepared),
		notes: [
			...prepared.notes,
			...fundingNotes(projection.unfundedContributions, currency),
			...withdrawNotes(prepared.document, projection, currency),
		],
		horizon: timeline.horizon,
		currency,
		runsOut: runsOutView(projection.runsOut, currency),
		taxYears: taxYearsOf(projection.levies, currency, prepared.document),
		tables,
	}
}

/**
 * The tables a run adds beyond the annual roll-up, each present only when its flag or Scenario asks for it,
 * so a run without them keeps its table list: the monthly rows (`--monthly`), the cash flow (`--breakdown`,
 * cli ADR-0058), the loans (`--liabilities`, cli ADR-0059) and the milestones (cli ADR-0049).
 */
function extraTablesOf(
	prepared: Placed,
	projection: Projection,
	monthly: boolean,
	breakdown: boolean,
	liabilities: boolean,
): ProjectionTable[] | AppError {
	const { currency } = prepared
	const tables: ProjectionTable[] = []
	if (monthly) {
		tables.push({
			name: "monthly",
			count: projection.rows.length,
			rows: projection.rows.map((row) =>
				monthlyRow(row, currency, agesOn(prepared.household, row.date)),
			),
		})
	}
	if (breakdown) {
		if (projection.cashflow === undefined) {
			return fail("internal", { message: "The engine returned no cash flow for --breakdown." })
		}
		const rows = cashflowRowsOf(projection.cashflow, currency)
		tables.push({ name: "cashflow", count: rows.length, rows })
	}
	if (liabilities) {
		const liabilityTables = liabilityTablesOf(projection.liabilities, currency)
		if (isAppError(liabilityTables)) return liabilityTables
		tables.push(...liabilityTables)
	}
	if (projection.milestones !== undefined) {
		const rows = milestoneRowsOf(projection.milestones)
		tables.push({ name: "milestones", count: rows.length, rows })
	}
	return tables
}
