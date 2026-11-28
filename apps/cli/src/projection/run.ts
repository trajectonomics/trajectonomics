import { type Projection, project } from "@trajectonomics/core/sim"
import type { AppError } from "../errors"
import { isAppError } from "../errors"
import { agesOn } from "../scenario/household/ages"
import type { Placed } from "./carryin-apply"
import { echoOf } from "./echo"
import { refusal } from "./engine"
import { estateNotes } from "./estate-notes"
import { fundingNotes } from "./funding"
import { optionsOf } from "./liabilities"
import { lifetimeFieldsOf } from "./lifetime-view"
import { routingOf } from "./routing"
import { routedRun } from "./routing-overflow"
import type { RoutingView } from "./routing-view"
import { annualRow, runsOutView } from "./rows"
import { extraTablesOf, type Wants } from "./run-tables"
import type { ProjectionRunView, ProjectionTable } from "./run-view"
import { taxYearsOf } from "./tax-view"
import { withdrawNotes } from "./withdraw-notes"

/**
 * `traj projection run`: the engine's Projection in the CLI's money, annual by default, with the
 * monthly rows when asked, with each roll-up's cash flow when `breakdown` is (cli ADR-0058) and each
 * Reporting year or month when `reporting` is (cli ADR-0086), with each loan's statement when
 * `liabilities` is (cli ADR-0059) and each Account's value when `accounts`
 * is (cli ADR-0060) and each spending rule's years when `spending` is (cli ADR-0063) and what the plan would leave when `estate` is (cli ADR-0064). It computes nothing the engine does not report (ADR-0030).
 */
export function projectionOf(prepared: Placed, wants: Wants): ProjectionRunView | AppError {
	const { breakdown, liabilities, spending, estate } = wants
	const { timeline, baseline } = prepared
	// The engine records each optional output only when asked, so a run without its flag keeps its bytes.
	const options = optionsOf(breakdown, liabilities, spending, estate, wants.reporting)
	const { result, notes } = routedRun(prepared.document, timeline, (routing) =>
		project(baseline, prepared.document, timeline, { ...options, ...routing }),
	)
	if (!result.ok) return refusal(result.problems)
	const view = runViewOf(prepared, wants, result.projection)
	return isAppError(view) ? view : { ...view, notes: [...view.notes, ...notes] }
}

/**
 * The result a Projection is reported as, whichever run made it: `traj projection run` and the replay of
 * one Market path (`traj projection path`, cli ADR-0069) state the same view of it.
 */
export function runViewOf(
	prepared: Placed,
	wants: Wants,
	projection: Projection,
): ProjectionRunView | AppError {
	const { estate } = wants
	const { timeline, currency } = prepared
	const annual = []
	for (const rollup of projection.annual) {
		const row = annualRow(rollup, projection.rows, currency, agesOn(prepared.household, rollup.to))
		if (isAppError(row)) return row
		annual.push(row)
	}
	const tables: ProjectionTable[] = [{ name: "annual", count: annual.length, rows: annual }]
	const extra = extraTablesOf(prepared, projection, annual, wants)
	if (isAppError(extra)) return extra
	tables.push(...extra)
	return {
		...echoOf(prepared),
		notes: [
			...prepared.notes,
			...fundingNotes(projection.unfundedContributions, currency),
			...withdrawNotes(prepared.document, projection, currency),
			...estateNotes(prepared.document, estate),
		],
		horizon: timeline.horizon,
		currency,
		// Present only with --breakdown-years or --breakdown-months, so a run without them keeps its bytes (cli ADR-0086).
		...(wants.reporting === undefined ? {} : { yearStart: wants.reporting.yearStart }),
		// Present only for a share, a floor or a target that keeps its value, so a plain plan keeps its bytes (cli ADR-0070).
		...routingEcho(prepared, projection),
		runsOut: runsOutView(projection.runsOut, currency),
		taxYears: taxYearsOf(projection.levies, currency, prepared.document),
		...lifetimeFieldsOf(projection, currency),
		tables,
	}
}

/** The `routing` field of a run, or nothing for a plain routing. */
function routingEcho(prepared: Placed, projection: Projection): { routing?: RoutingView } {
	const routing = routingOf(prepared.document, prepared.currency, projection.routing)
	return routing === undefined ? {} : { routing }
}
