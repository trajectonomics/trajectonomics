/**
 * The body of `POST /reread`: nothing, or the inputs of the allowance reads. The server keeps them with the
 * Snapshot's parameters and reads again; nothing is written to the ledger. A strict schema, so no other
 * field is accepted ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
import { z } from "zod"
import { allowancePlan } from "../snapshot/allowance-params"

/** A reread: `{}` reads again as it is; `allowances` states the inputs of the allowance reads, null clears them. */
export const rereadSchema = z.strictObject({ allowances: allowancePlan.nullable().optional() })

/** One reread request, parsed. */
export type Reread = z.infer<typeof rereadSchema>
