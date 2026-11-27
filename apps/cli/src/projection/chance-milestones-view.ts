import { z } from "zod"
import { dateField } from "./money"
import { personAge } from "./person-ages"

/** The Percentile levels every Milestone fire-date report states, in order. */
export const milestoneDatesLevels = [10, 25, 50, 75, 90] as const

/** One Milestone date's Percentile and the household's ages on that date. */
export type MilestoneDateView = { date: string; ages: { person: string; age: number }[] }

/** A Milestone's fire-date Percentiles, by level; null when no path reached it. */
export type MilestoneDatesView = {
	p10: MilestoneDateView | null
	p25: MilestoneDateView | null
	p50: MilestoneDateView | null
	p75: MilestoneDateView | null
	p90: MilestoneDateView | null
}

/** How many paths reached one Milestone, and that count as the chance's success-share format. */
export type MilestoneReachedView = { paths: number; share: string }

/** When one Milestone fired across the Market paths, in Scenario order (sim ADR 0011). */
export type ChanceMilestoneView = {
	id: string
	displayLabel: string | null
	reached: MilestoneReachedView
	dates: MilestoneDatesView | null
	byYear: { year: number; paths: number }[]
}

export const milestoneDate: z.ZodType<MilestoneDateView> = z.strictObject({
	date: dateField("The first day of the calendar month this Percentile's fire falls in"),
	ages: z
		.array(personAge)
		.describe(
			"Each household person's age on the date, in household order; empty without a household. A person not in the plan on the date is left out.",
		),
})

const milestoneDates: z.ZodType<MilestoneDatesView> = z.strictObject({
	p10: milestoneDate
		.nullable()
		.describe("The 10th Percentile fire date, or null when it is absent."),
	p25: milestoneDate
		.nullable()
		.describe("The 25th Percentile fire date, or null when it is absent."),
	p50: milestoneDate
		.nullable()
		.describe("The 50th Percentile fire date, or null when it is absent."),
	p75: milestoneDate
		.nullable()
		.describe("The 75th Percentile fire date, or null when it is absent."),
	p90: milestoneDate
		.nullable()
		.describe("The 90th Percentile fire date, or null when it is absent."),
})

const chanceMilestone: z.ZodType<ChanceMilestoneView> = z.strictObject({
	id: z.string().describe("The Milestone's id, as the Scenario names it."),
	displayLabel: z
		.string()
		.nullable()
		.describe("What a person reads in place of the id, or null when the plan gives it none."),
	reached: z
		.strictObject({
			paths: z
				.number()
				.int()
				.describe("Market paths on which the Milestone fired on or before the run's end."),
			share: z
				.string()
				.describe("That count as a percentage of the paths, in the success share's format."),
		})
		.describe("How many Market paths reached the Milestone."),
	dates: milestoneDates
		.nullable()
		.describe("The five Percentile fire dates, or null when no path reached the Milestone."),
	byYear: z
		.array(
			z.strictObject({
				year: z.number().int().describe("The calendar year."),
				paths: z.number().int().describe("Market paths that fired the Milestone in it."),
			}),
		)
		.describe("One row per calendar year with a fire, ascending; years with none are left out."),
})

export const milestonesField: z.ZodOptional<z.ZodType<ChanceMilestoneView[]>> = z
	.array(chanceMilestone)
	.optional()
	.describe(
		"One entry per Milestone in Scenario order. Present only with --milestone-dates; every other field is as without it.",
	)

/** `--milestone-dates`: also state when each Milestone fired across the Market paths. */
export const milestoneDatesFlag: z.ZodDefault<z.ZodBoolean> = z
	.boolean()
	.default(false)
	.describe(
		"Also report when each Milestone fired across the Market paths: how many reached it, its 10th to 90th Percentile fire dates with each household person's age, and the paths per year. The rest of the result is as without it.",
	)
