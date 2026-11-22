import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { personAges } from "./person-age"

/** One annual row: the roll-up of a year, with its real net worth measured at a monthly row. */
const annualRow = z.strictObject({
	index: integer,
	from: dateString,
	to: dateString,
	ages: personAges,
	openingNetWorth: money,
	closingNetWorth: money,
	income: money,
	expense: money,
	contributions: money,
	unfundedContributions: money,
	interest: money,
	unmet: money,
	partial: z.boolean(),
	realNetWorth: z.strictObject({ date: dateString, amount: money }),
})

/** One monthly row: net worth on the row's date, nominal and real, and the accessible share. */
const monthlyRow = z.strictObject({
	date: dateString,
	ages: personAges,
	netWorth: money,
	realNetWorth: money,
	accessibleNetWorth: money,
	realAccessibleNetWorth: money,
})

/**
 * One Milestone's fire date: the date it fired, or null when it did not fire by the Projection's end
 * (cli ADR-0049). Rows come in Scenario order.
 */
export const milestoneRow = z.strictObject({
	id: z.string(),
	reached: z.boolean(),
	date: dateString.nullable(),
})

/**
 * The projection's tables: the annual roll-up always, the monthly rows only with `--monthly`, and the
 * milestones only when the Scenario declares them.
 */
export const projectionTables = z.array(
	z.discriminatedUnion("name", [
		z.strictObject({ name: z.literal("annual"), count: integer, rows: z.array(annualRow) }),
		z.strictObject({ name: z.literal("monthly"), count: integer, rows: z.array(monthlyRow) }),
		z.strictObject({
			name: z.literal("milestones"),
			count: integer,
			rows: z.array(milestoneRow),
		}),
	]),
)
export type ProjectionTables = z.infer<typeof projectionTables>
