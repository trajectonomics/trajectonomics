import { z } from "zod"
import { carryInRecord } from "./carry-in"
import { dateString } from "./date"
import { fiResult } from "./fi-result"
import { integer } from "./integer"
import { money } from "./money"
import { override } from "./projection-shape"
import { milestoneRow } from "./projection-tables"
import { scenarioRef } from "./scenario-ref"
import { taxYear } from "./tax-year"

/** A net worth at a point: nominal and real, as decimal strings. */
const pointOfNetWorth = z.strictObject({ date: dateString, nominal: money, real: money })

/** The net worth at one of the ages a compare was asked for; null where the age is not reached. */
export const atAge = z.strictObject({
	age: integer,
	nominal: money.nullable(),
	real: money.nullable(),
})

/** One side of a compare: the same fields a single projection states, under its own Scenario. */
export const compareSide = z.strictObject({
	scenario: scenarioRef,
	overrides: z.array(override),
	removals: z.array(z.string()),
	carryIn: z.array(carryInRecord).optional(),
	fi: fiResult,
	taxYears: z.array(taxYear),
	runOut: z.strictObject({ date: dateString, unmet: money }).nullable(),
	/** This side's milestones in Scenario order, present only when its Scenario declares them. */
	milestones: z.array(milestoneRow).optional(),
	netWorth: z.strictObject({ final: pointOfNetWorth, atAges: z.array(atAge) }),
})
export type CompareSide = z.infer<typeof compareSide>
