/**
 * A guided first plan, saved as one Edit, `start-guided-plan` ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)):
 * the person's household, their money answers and the age they stop working. The server reads the CLI's decimal
 * template at the As-of and builds the document from these answers in `guided-document.ts`; this module holds the
 * answers' schema and the household they make. Pure.
 */
import { z } from "zod"
import { dateString } from "../contract"
import { planName } from "./fields"
import { FLOW_ID } from "./tax-labels"

/** A Flow id as a guided plan names it: one to 256 characters with no `=` and no control character, as a tax label ids one. */
const flowId = z.string().min(1).max(256).regex(FLOW_ID)

/** A typed amount: digits with at most two decimal places, as the page sends it once the commas are off. */
const amountText = z.string().regex(/^\d{1,15}(\.\d{1,2})?$/, "an amount such as 12500 or 12500.50")

/** The one dotted path the household's age anchor writes: the stop-work Milestone's date. */
export const STOP_WORK_PATH = "milestones.stop-work.criteria.age.on"

/**
 * The money answers: one row per Account the `baseline rates` read carried, each kept or dropped with an optional
 * typed amount and earned flag, or the two typed totals the short path sends instead. The page never sums them.
 */
const moneyAnswers = z.discriminatedUnion("from", [
	z.strictObject({
		from: z.literal("history"),
		rows: z
			.array(
				z.strictObject({
					id: flowId,
					keep: z.boolean(),
					// Absent means the amount the read stated.
					amount: amountText.optional(),
					// Absent on income means earned, as the template states it.
					earned: z.boolean().optional(),
				}),
			)
			.min(1)
			.max(500),
	}),
	z.strictObject({ from: z.literal("totals"), income: amountText, spending: amountText }),
])

/**
 * One guided plan: a new name, the Snapshot's As-of, the money answers, the household's people as the form holds
 * them (the CLI checks their fields) and the holder's stop-work age. Strict: an unknown field is refused.
 */
export const guidedEditSchema = z.strictObject({
	kind: z.literal("start-guided-plan"),
	name: planName,
	asOf: dateString,
	money: moneyAnswers,
	people: z.array(z.record(z.string(), z.unknown())).min(1).max(20),
	stopWork: z.strictObject({
		person: z.string().min(1).max(100),
		age: z.number().int().min(0).max(150),
	}),
})

/** A guided plan's Edit, parsed. */
export type GuidedEdit = z.infer<typeof guidedEditSchema>

/** The history answers of one guided plan. */
export type GuidedRows = Extract<GuidedEdit["money"], { from: "history" }>["rows"]

/**
 * The household the plan is saved with: the people as typed, and one anchor that dates the stop-work Milestone to
 * the holder's age. Its schema version is 1, so no item is owned and none of the plan's dates is pinned but this one.
 */
export function guidedHousehold(edit: GuidedEdit): {
	schemaVersion: 1
	people: readonly Record<string, unknown>[]
	anchors: { path: string; person: string; age: number }[]
} {
	return {
		schemaVersion: 1,
		people: edit.people,
		anchors: [{ path: STOP_WORK_PATH, person: edit.stopWork.person, age: edit.stopWork.age }],
	}
}
