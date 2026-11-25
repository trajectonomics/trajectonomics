import { z } from "zod"
import { dateString } from "./date"

/**
 * An Account a Scenario assumes: its name in the document, its kind, and its rate in basis points. Its
 * `kind` is the closed vocabulary the pages branch on, so it stays an enum; every other word list
 * (compounding, a payout's frequency and rounding, a fee's rounding) is shown only, so it is a plain
 * string and a word the CLI adds is shown as it is (web ADR 0001, amendment 2026-11-25).
 */
export const scenarioAccount = z.looseObject({
	id: z.string(),
	kind: z.enum(["asset", "liability"]),
	rate: z.number().int(),
	// An asset's yearly swing, in basis points (cli ADR 0068): only the chance of success reads it, from the plan's own model.
	volatility: z.number().int().optional(),
	// Read-only vocabularies (web ADR 0001, amendment 2026-11-25): the page only shows these words, so they are plain strings and a word the CLI adds is shown as it is.
	compounding: z.string().optional(),
	lockedUntil: dateString.optional(),
	// false marks an asset that is in net worth but not accessible: a home or a car (sim ADR 0019).
	liquid: z.boolean().optional(),
	// A share of the value paid out as passive income (sim ADR 0027); `bps` is a percent string such as "3.50" in the decimal form (cli ADR-0067).
	payout: z
		.looseObject({
			bps: z.string(),
			frequency: z.string(),
			rounding: z.string(),
			start: dateString.optional(),
			end: dateString.optional(),
			startAt: z.string().optional(),
			endAt: z.string().optional(),
			label: z.string().optional(),
			prepayments: z.array(z.looseObject({ levy: z.string(), bps: z.number().int() })).optional(),
		})
		.optional(),
	// A yearly share of the value charged every month, outside cashflow (sim ADR 0028); `bps` is a percent string in the decimal form.
	fee: z.looseObject({ bps: z.string(), rounding: z.string() }).optional(),
})
export type ScenarioAccount = z.infer<typeof scenarioAccount>
