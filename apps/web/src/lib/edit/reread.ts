/**
 * The body of `POST /reread`: nothing, or the inputs of the allowance reads, or the paths and seed of the chance reads. The server keeps them with the
 * Snapshot's parameters and reads again; nothing is written to the ledger. A strict schema, so no other
 * field is accepted ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
import { z } from "zod"
import { allowancePlan } from "../snapshot/allowance-params"
import { chanceInputs } from "../snapshot/chance-params"

/**
 * A reread: `{}` reads again as it is; `allowances` states the inputs of the allowance reads, null clears them; `chance`
 * states the paths and the seed of the chance reads (web ADR 0018).
 */
export const rereadSchema = z.strictObject({
	allowances: allowancePlan.nullable().optional(),
	chance: chanceInputs.optional(),
})

/** One reread request, parsed. */
export type Reread = z.infer<typeof rereadSchema>
