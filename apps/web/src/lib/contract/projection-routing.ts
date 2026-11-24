import { z } from "zod"
import { integer } from "./integer"
import { money } from "./money"

/*
 * The `routing` echo of `traj projection run --json` (cli ADR-0070): the surplus steps and the withdrawal entries
 * as the document states them, each by its position. Every figure is the document's own; the amount a grown target is
 * worth on a later date is the engine's and is not in it.
 */

/** A growth as the document states it. */
const growth = z.union([z.literal("inflation"), z.strictObject({ bps: integer })])

/** A target: the amount the document wrote and, when it keeps its value in today's money, its growth. */
const routedTarget = z.strictObject({ amount: money, growth: growth.nullable() })

/** One surplus step, by its position in `cashflow.surplus`. */
export const surplusEntry = z.strictObject({
	entry: integer,
	account: z.string(),
	upTo: routedTarget.nullable(),
	share: integer.nullable(),
})

/** One withdrawal entry, by its position in `cashflow.withdraw`. */
export const withdrawEntry = z.strictObject({
	entry: integer,
	account: z.string(),
	downTo: routedTarget.nullable(),
})

export const routing = z.strictObject({
	surplus: z.array(surplusEntry),
	withdraw: z.array(withdrawEntry),
})
export type Routing = z.infer<typeof routing>
