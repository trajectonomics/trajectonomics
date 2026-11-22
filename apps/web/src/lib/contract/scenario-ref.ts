import { z } from "zod"

/** A Scenario as a projection names it: its id, name and the hashes of its document. */
export const scenarioRef = z.strictObject({
	id: z.string(),
	name: z.string(),
	contentHash: z.string(),
	effectiveContentHash: z.string(),
})
export type ScenarioRef = z.infer<typeof scenarioRef>
