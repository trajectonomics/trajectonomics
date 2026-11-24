import { z } from "zod"
import { dateString } from "./date"
import { money } from "./money"
import { routing } from "./projection-routing"
import { projectionShape } from "./projection-shape"
import { projectionTables } from "./projection-tables"
import { taxYear } from "./tax-year"

/**
 * One fee or payout Account's totals over the whole horizon, as the engine states them (sim ADR 0027, 0028; cli
 * ADR 0067). Each figure is present only when the Account declares that item.
 */
export const accountLifetime = z.strictObject({
	account: z.string(),
	lifetimeFees: money.optional(),
	lifetimePayouts: money.optional(),
})
export type AccountLifetime = z.infer<typeof accountLifetime>

/** `traj projection run --json`: the Baseline projected through one Scenario, year by year. */
export const projectionRun = z.strictObject({
	...projectionShape,
	// The routing the document states; present only for a share, a Reserve floor or a target that keeps its value (cli ADR-0070).
	routing: routing.optional(),
	runsOut: z.strictObject({ date: dateString, unmet: money }).nullable(),
	taxYears: z.array(taxYear),
	/** The plan's fees over the horizon; present only when an Account carries a fee (cli ADR 0067). */
	lifetimeFees: money.optional(),
	/** Each fee or payout Account's totals over the horizon, in Scenario order; present only when one carries a fee or a payout. */
	accountLifetimes: z.array(accountLifetime).optional(),
	tables: projectionTables,
})
export type ProjectionRun = z.infer<typeof projectionRun>
