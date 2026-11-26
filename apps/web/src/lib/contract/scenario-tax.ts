import { z } from "zod"
import { taxAllowances } from "./tax-profile"
import { assumption } from "./tax-year"

/**
 * The Scenario a write reports: its row and the document as the store holds it, in the integer form a
 * write prints, and an id that is null while a dry run mints one (cli ADR-0055). The page reads no field
 * of it; it is kept because the CLI states it.
 */
const writtenScenario = z.strictObject({
	id: z.string().nullable(),
	name: z.string(),
	contentHash: z.string(),
	forkedFrom: z.string().nullable(),
	version: z.number().int(),
	createdAt: z.string(),
	updatedAt: z.string(),
	document: z.record(z.string(), z.unknown()),
})

/**
 * `traj scenario tax --from-stored --dry-run --json`, run as a read: a dry run rolls the write back, so it
 * states what the stored profile would write and stores nothing (cli ADR-0075). The page reads only
 * `unclaimed` and the separate-loans note on the ceiling's assumption; the rest is kept because the CLI states it.
 */
export const scenarioTax = z.strictObject({
	dryRun: z.boolean(),
	status: z.string(),
	levy: z.string().optional(),
	levies: z.array(z.string()).optional(),
	filers: z.array(z.string()).optional(),
	allowances: taxAllowances.optional(),
	assumptions: z.array(assumption).optional(),
	unclaimed: z.array(z.string()).optional(),
	scenario: writtenScenario,
})
export type ScenarioTax = z.infer<typeof scenarioTax>
