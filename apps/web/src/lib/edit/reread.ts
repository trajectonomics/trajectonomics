/**
 * The body of `POST /reread`: nothing, or the inputs of the allowance reads, or the paths and seed of the chance reads, or
 * one Market path to read live. The server keeps the inputs with the Snapshot's parameters and reads again; nothing is
 * written to the ledger. A strict schema, so no other field is accepted ([ADR 0008](../../../docs/adr/0008-the-dashboard-edits-scenarios-through-traj-on-loopback.md)).
 */
import { z } from "zod"
import { allowancePlan } from "../snapshot/allowance-params"
import { chanceInputs } from "../snapshot/chance-params"
import { pathRequest } from "../snapshot/paths"
import { planName } from "./fields"

/**
 * A reread: `{}` reads again as it is; `allowances` states the inputs of the allowance reads, null clears them; `chance`
 * states the paths and the seed of the chance reads (web ADR 0018). `path` reads one Market path with the plan and its
 * index and nothing else, and answers that one read, not the Snapshot (web ADR 0020): it is never sent with another field.
 * `addPlan` adds a plan the ledger holds to the plans the Snapshot projects, and writes nothing (web ADR 0023), and is sent alone.
 */
export const rereadSchema = z
	.strictObject({
		allowances: allowancePlan.nullable().optional(),
		chance: chanceInputs.optional(),
		path: pathRequest.optional(),
		addPlan: planName.optional(),
	})
	.refine(
		(body) =>
			(body.path === undefined ||
				(body.allowances === undefined &&
					body.chance === undefined &&
					body.addPlan === undefined)) &&
			(body.addPlan === undefined || (body.allowances === undefined && body.chance === undefined)),
		"a path and a plan to add are each sent alone",
	)

/** One reread request, parsed. */
export type Reread = z.infer<typeof rereadSchema>
