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
		}),
	),
})
export type ScenarioList = z.infer<typeof scenarioList>
