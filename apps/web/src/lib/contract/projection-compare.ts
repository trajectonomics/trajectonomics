import { z } from "zod"
import { atAge, compareSide } from "./compare-side"
import { dateString } from "./date"
import { engine } from "./engine"
import { integer } from "./integer"
import { money } from "./money"
import { taxStatus } from "./projection-shape"

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
	}),
	tax: taxStatus,
	notes: z.array(z.string()),
})
export type ProjectionCompare = z.infer<typeof projectionCompare>
