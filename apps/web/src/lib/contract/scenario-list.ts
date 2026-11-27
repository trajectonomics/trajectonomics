import { z } from "zod"
import { integer } from "./integer"

/** `traj scenario list --json`: every stored Scenario, with its content hash and fork parent. */
export const scenarioList = z.strictObject({
	scenarios: z.array(
		z.strictObject({
			id: z.string(),
			name: z.string(),
			contentHash: z.string(),
			forkedFrom: z.string().nullable(),
			version: integer,
			createdAt: z.string(),
			updatedAt: z.string(),
			/** True when the document holds a tax Levy (cli ADR-0066); absent in a Snapshot saved before it. */
			taxed: z.boolean().optional(),
			/** True when the plan has notes (cli ADR-0071); absent in a Snapshot saved before it. */
			hasNotes: z.boolean().optional(),
			/** True when the plan declares Milestones (cli ADR-0081); absent in a Snapshot saved before it. */
			hasMilestones: z.boolean().optional(),
			/** True for the ledger's main plan, a label and not a default (cli ADR-0071); absent in an older Snapshot. */
			main: z.boolean().optional(),
		}),
	),
})
export type ScenarioList = z.infer<typeof scenarioList>
