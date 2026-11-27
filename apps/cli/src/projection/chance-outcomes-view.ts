import { z } from "zod"
import { dateField, moneyField } from "./money"
import { type RunsOutView, runsOut } from "./view"

/*
 * `projection chance --outcomes`: what each Market path came to, and the paths worth opening first
 * (cli ADR-0069). The engine decides every figure (sim ADR-0011); these are the names a person, an agent
 * and the Dashboard read.
 */

/** One Market path's result: the same figures the Bands are read from, in the CLI's money. */
export type ChanceOutcomeView = {
	/** The path's position in the run under its seed: the handle `projection path --index` takes. */
	index: number
	closingNetWorth: string
	lowestNetWorth: string
	/** The first day of the Annual roll-up whose closing net worth was the path's lowest. */
	lowestYear: string
	runsOut: RunsOutView | null
	/** Fired Milestone dates by id, present only with `--milestone-dates` too (sim ADR 0011). */
	milestones?: Record<string, string> | undefined
}

/** The path indexes a reader opens first, without sorting every outcome. */
export type ChanceRepresentativeView = {
	/** The path at the 10th Percentile of closing net worth, by nearest rank. */
	p10: number
	p50: number
	p90: number
	/** The path that first ran out earliest, or null when no path ran out. */
	earliestRunsOut: number | null
	/** The path with the lowest net worth at any Annual roll-up. */
	lowest: number
}

const outcome: z.ZodType<ChanceOutcomeView> = z.strictObject({
	index: z
		.number()
		.int()
		.describe("The path's 0-based position in the run under its seed: `projection path --index`."),
	closingNetWorth: moneyField(
		"Net worth at the last Annual roll-up end; a path that ran out is pinned at what it died with",
	),
	lowestNetWorth: moneyField("The least closing net worth of any of the path's Annual roll-ups"),
	lowestYear: dateField(
		"The first day of the Annual roll-up that closed at lowestNetWorth, the earliest on a tie",
	),
	runsOut: runsOut
		.nullable()
		.describe("The month the path ran out of money and what it could not fund, or null."),
	milestones: z
		.record(z.string(), dateField("The date the Milestone fired on this path"))
		.optional()
		.describe(
			"Fired Milestone dates by id, in the order the run reported them. Present only with --milestone-dates too (sim ADR 0011).",
		),
})

export const outcomesField: z.ZodOptional<z.ZodType<ChanceOutcomeView[]>> = z
	.array(outcome)
	.optional()
	.describe(
		"One row per Market path, in path order. Present only with --outcomes (cli ADR-0069); every other field is as without it.",
	)

const index = (what: string) => z.number().int().describe(what)

export const representativeField: z.ZodOptional<z.ZodType<ChanceRepresentativeView>> = z
	.strictObject({
		p10: index("The index of the path at the 10th Percentile of closingNetWorth, by nearest rank."),
		p50: index("The index of the path at the 50th Percentile of closingNetWorth."),
		p90: index("The index of the path at the 90th Percentile of closingNetWorth."),
		earliestRunsOut: index("The index of the path that first ran out earliest.").nullable(),
		lowest: index("The index of the path with the lowest lowestNetWorth."),
	})
	.optional()
	.describe(
		"The path indexes worth opening with `projection path --index`. A tie goes to the lower index. Present only with --outcomes (cli ADR-0069).",
	)

/** `--outcomes`: also list each Market path's outcome. */
export const outcomesFlag: z.ZodDefault<z.ZodBoolean> = z
	.boolean()
	.default(false)
	.describe(
		"Also report what each Market path came to (closing net worth, lowest net worth, the year it was lowest, when it ran out) and the paths worth opening first. The rest of the result is as without it.",
	)
