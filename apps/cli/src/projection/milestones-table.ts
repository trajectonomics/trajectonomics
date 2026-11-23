import { z } from "zod"
import { type MilestoneRow, milestoneRow } from "./milestones"

/** The table of Milestones a run states when the Scenario declares any (cli ADR-0049). */
export type MilestonesTable = { name: "milestones"; count: number; rows: MilestoneRow[] }

export const milestonesTable: z.ZodType<MilestonesTable> = z.strictObject({
	name: z
		.literal("milestones")
		.describe("Each Milestone's fire date, present only when the Scenario declares Milestones."),
	count: z.number().int().describe("The number of Milestones."),
	rows: z.array(milestoneRow).describe("One row per Milestone, in Scenario order."),
})
