import { project } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { agesOn } from "../scenario/household/ages"
import type { Placed } from "./carryin-apply"
import { echoOf } from "./echo"
import { refusal } from "./engine"
import { fundingNotes } from "./funding"
import { milestoneRowsOf } from "./milestones"
import { annualRow, monthlyRow, runsOutView } from "./rows"
import type { ProjectionRunView, ProjectionTable } from "./run-view"
import { taxYearsOf } from "./tax-view"
import { withdrawNotes } from "./withdraw-notes"

/**
 * `traj projection run`: the engine's Projection in the CLI's money, annual by default and with
 * the monthly rows when asked. It computes nothing the engine does not report (ADR-0030).
 */
export function projectionOf(prepared: Placed, monthly: boolean): ProjectionRunView | AppError {
	const { timeline, baseline, currency } = prepared
	const result = project(baseline, prepared.document, timeline)
	if (!result.ok) return refusal(result.problems)
	const { projection } = result
	const annual = []
	for (const rollup of projection.annual) {
		const row = annualRow(rollup, projection.rows, currency, agesOn(prepared.household, rollup.to))
		if (isAppError(row)) return row
		annual.push(row)
	}
	const tables: ProjectionTable[] = [{ name: "annual", count: annual.length, rows: annual }]
	if (monthly) {
		tables.push({
			name: "monthly",
			count: projection.rows.length,
			rows: projection.rows.map((row) =>
				monthlyRow(row, currency, agesOn(prepared.household, row.date)),
			),
		})
	}
	// Present only when the Scenario declares Milestones, so an older Scenario's table list is unchanged.
	if (projection.milestones !== undefined) {
		const rows = milestoneRowsOf(projection.milestones)
		tables.push({ name: "milestones", count: rows.length, rows })
	}
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
