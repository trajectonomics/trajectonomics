import { z } from "zod"
import { money } from "./money"

/**
 * A routing target in the decimal form (cli ADR-0070): a decimal string, or `{ amount, growth }` with the amount a decimal
 * string, grown by whole years from the start of the Timeline so it keeps its value in today's money.
 */
export const routedAmount = z.union([
	money,
	z.looseObject({
		amount: money,
		growth: z.union([z.literal("inflation"), z.looseObject({ bps: z.number().int() })]),
	}),
])

/**
 * The Scenario's `cashflow` in the decimal form (sim ADR 0030, cli ADR-0070): the surplus steps, each with an optional
 * `upTo` and `share` (a percent string such as "30.00", as a rate is in the decimal form), and the withdrawal entries, each an Account's id or `{ account, downTo }`. Any key
 * it does not know is kept as it is. Each list is optional, so a partial document a view builds still decodes; the engine requires all three.
 */
export const scenarioCashflow = z.looseObject({
	surplus: z
		.array(
			z.looseObject({
				account: z.string(),
				upTo: routedAmount.optional(),
				share: z.string().optional(),
			}),
		)
		.optional(),
	contribute: z.array(z.string()).optional(),
	withdraw: z
		.array(z.union([z.string(), z.looseObject({ account: z.string(), downTo: routedAmount })]))
		.optional(),
})
export type ScenarioCashflow = z.infer<typeof scenarioCashflow>
