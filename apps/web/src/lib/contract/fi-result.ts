import { z } from "zod"
import { dateString } from "./date"
import { integer } from "./integer"
import { money } from "./money"
import { personAges } from "./person-age"

/** The rule-of-thumb reference an FI date is read against: its threshold and the figures it divides. */
const reference = z.strictObject({
	label: z.literal("ruleOfThumb"),
	date: dateString,
	multiplier: z.number(),
	basis: z.enum(["unlockedAssets", "allAssets", "accessibleNetWorth", "netWorth"]),
	window: z.enum(["next12Months", "trailing12Months"]),
	terms: z.enum(["nominal", "real"]),
	unlockedAssets: money,
	numerator: money,
	annualExpenses: money,
	threshold: money,
	multipleBps: integer.nullable(),
	partial: z.boolean(),
	met: z.boolean(),
})

/** The FI date is reachable: the survival date, with the reference it was read against. */
const reachable = z.strictObject({
	reachable: z.literal(true),
	fiDate: dateString,
	reference,
})

/** The FI date is unreachable because no month could start a stop. */
const noCandidate = z.strictObject({
	reachable: z.literal(false),
	binding: z.literal("noCandidateMonth"),
})

/** The FI date is unreachable: what binds, and the best case the Scenario can reach. */
const unreachable = z.strictObject({
	reachable: z.literal(false),
	binding: z.enum(["shortfallBeforeStop", "undrawableMoney", "insufficientMoney", "minimumBuffer"]),
	bestCase: z.union([
		z.strictObject({
			month: dateString,
			runsOut: z.strictObject({ date: dateString, unmet: money }),
		}),
		z.strictObject({
			month: dateString,
			bufferBreach: z.strictObject({ date: dateString, required: money, accessible: money }),
		}),
	]),
})

/** The survival-method answer: reachable with a date, or unreachable with what binds. */
export const fiResult = z.union([reachable, noCandidate, unreachable])
export type FiResult = z.infer<typeof fiResult>

/** The `fi` leaf's answer: a reachable date also states each person's age on that date (cli ADR-0048). */
export const fiLeafResult = z.union([
	reachable.extend({ ages: personAges }),
	noCandidate,
	unreachable,
])
export type FiLeafResult = z.infer<typeof fiLeafResult>
