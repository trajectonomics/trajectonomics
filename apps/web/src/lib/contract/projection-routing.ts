import { z } from "zod"
import { integer } from "./integer"
import { money } from "./money"

/*
 * The `routing` echo of `traj projection run --json` (cli ADR-0070): the surplus steps and the withdrawal entries
 * as the document states them, each by its position. Every figure is the document's own, and an entry whose target
 * keeps its value in today's money adds the engine's `resolved`: what that target is worth at the start and at the
 * horizon. It is optional, because a nominal target and an entry with no target state none.
 */

/** A growth as the document states it. */
const growth = z.union([z.literal("inflation"), z.strictObject({ bps: integer })])

/** A target: the amount the document wrote and, when it keeps its value in today's money, its growth. */
const routedTarget = z.strictObject({ amount: money, growth: growth.nullable() })

/** What a grown target is worth, from the engine: on the first day of the Timeline and on the horizon date. */
const resolved = z.strictObject({ first: money, horizon: money })

/** One surplus step, by its position in `cashflow.surplus`. */
export const surplusEntry = z.strictObject({
	entry: integer,
	account: z.string(),
	upTo: routedTarget.nullable(),
	// The percent of the money still unrouted the step takes, as a string such as "30.00"; null when it takes everything it can.
	share: z.string().nullable(),
	resolved: resolved.optional(),
})

/** One withdrawal entry, by its position in `cashflow.withdraw`. */
export const withdrawEntry = z.strictObject({
	entry: integer,
	account: z.string(),
	downTo: routedTarget.nullable(),
	resolved: resolved.optional(),
})

export const routing = z.strictObject({
	surplus: z.array(surplusEntry),
	withdraw: z.array(withdrawEntry),
})
export type Routing = z.infer<typeof routing>
