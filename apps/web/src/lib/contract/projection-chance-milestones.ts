import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { personAges } from "./person-age"

/** One Milestone fire-date Percentile, with each household person's age on that date. */
const milestoneDate = z.strictObject({ date: dateString, ages: personAges })

/** The five fire-date Percentiles of one Milestone, in level order. */
const milestoneDates = z.strictObject({
	p10: milestoneDate.nullable(),
	p25: milestoneDate.nullable(),
	p50: milestoneDate.nullable(),
	p75: milestoneDate.nullable(),
	p90: milestoneDate.nullable(),
})

/** When one Milestone fired across the Market paths (cli ADR-0081, sim ADR-0011). */
const chanceMilestone = z.strictObject({
	id: z.string(),
	displayLabel: z.string().nullable(),
	reached: z.strictObject({
		paths: integer,
		share: z.string().regex(/^\d+\.\d{2}%$/, "a percentage with two places"),
	}),
	dates: milestoneDates.nullable(),
	byYear: z.array(z.strictObject({ year: integer, paths: integer })),
})

/** The Milestones `projection chance --milestone-dates` states, in Scenario order. */
export const chanceMilestones = z.array(chanceMilestone)
