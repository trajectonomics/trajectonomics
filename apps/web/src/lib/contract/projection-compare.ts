import { z } from "zod"
import { atAge, compareSide } from "./compare-side"
import { dateString } from "./date"
import { engine } from "./engine"
import { integer } from "./integer"
import { money } from "./money"
import { taxStatus } from "./projection-shape"

/** One figure of a compare's annual row: each side's value, and b minus a where it has a meaning. */
const compareFigure = z.strictObject({
	a: money.nullable(),
	b: money.nullable(),
	delta: money.nullable(),
})

/** One side's own period of a year: its first and last day. */
const periodView = z.strictObject({ from: dateString, to: dateString })

/** One year of the annual table: the figures of each side and the change where the periods agree. */
const compareAnnualRow = z.strictObject({
	index: integer,
	from: dateString.nullable(),
	to: dateString.nullable(),
	periods: z.strictObject({ a: periodView.nullable(), b: periodView.nullable() }),
	closingNetWorth: compareFigure,
	income: compareFigure,
	expense: compareFigure,
	contributions: compareFigure,
	interest: compareFigure,
	levy: compareFigure.optional(),
})

/** One Milestone declared on both sides: each side's fire date and whole months from a to b. */
const milestoneDelta = z.strictObject({
	id: z.string(),
	a: dateString.nullable(),
	b: dateString.nullable(),
	months: integer.nullable(),
})

/** `traj projection compare --json`: two Scenarios side by side and the deltas between them. */
export const projectionCompare = z.strictObject({
	asOf: dateString,
	horizon: dateString,
	currency: z.string(),
	engine,
	birthDate: dateString.nullable(),
	sides: z.strictObject({ a: compareSide, b: compareSide }),
	deltas: z.strictObject({
		fiMonths: integer.nullable(),
		runOutYears: integer.nullable(),
		netWorth: z.strictObject({ nominal: money, real: money }).nullable(),
		atAges: z.array(atAge),
		milestones: z.array(milestoneDelta).optional(),
	}),
	tables: z.array(
		z.strictObject({
			name: z.literal("annual"),
			count: integer,
			rows: z.array(compareAnnualRow),
		}),
	),
	tax: taxStatus,
	notes: z.array(z.string()),
})
export type ProjectionCompare = z.infer<typeof projectionCompare>
