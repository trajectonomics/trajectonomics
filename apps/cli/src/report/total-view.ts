import { z } from "zod"
import type { TotalRefusal } from "./total"

export const totalRefusal: z.ZodType<TotalRefusal> = z
	.strictObject({
		code: z.string().describe("The code the total's refusal has: AMOUNT_OVERFLOW."),
		exitCode: z
			.number()
			.int()
			.describe("The exit code the same refusal would give as the call's own."),
		message: z.string(),
		path: z.string().optional(),
		hint: z.string().optional(),
		details: z.unknown().optional(),
	})
	.describe("Why the total is not stated, in the fields of an error envelope.")

/** What the amounts above a refused total are called: a Balance at a date, an amount over a period, or none (`doctor` states no rows). */
type Figure = "balance" | "amount" | "none"

/**
 * Why a total is not stated, as the clause every refused total shares: `totalSentence` prefixes it
 * with `not stated: `, and `doctor` states it after its own words because it states no rows.
 */
export const outOfRangeClause =
	"every account is in range, but their sum exceeds the safe integer range"

/**
 * The human sentence for a result whose total is refused, in place of the total's line. JSON carries
 * the refusal; a person at a terminal reads that every account is stated and the sum is not.
 */
export function totalSentence(figure: Figure = "balance"): string {
	const range = `not stated: ${outOfRangeClause}`
	return figure === "none" ? range : `${range}; each account's ${figure} above is stated`
}

/**
 * Where a total sits in a result, and the key of its refusal beside it. A total at the top is the
 * result's own; `within` names a nested record (`trialBalance`) or a list of them (`months`).
 */
export type TotalPlace = {
	total: "totals" | "netWorth"
	error: "totalsError" | "netWorthError"
	figure?: Figure
	within?: "trialBalance" | "months"
}

function isRefusal(value: unknown): value is TotalRefusal {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof (value as Record<string, unknown>)["message"] === "string"
	)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** One record, with its total's line a sentence when it carries a refusal; otherwise as it is. */
function sentenceOf(record: Record<string, unknown>, place: TotalPlace): Record<string, unknown> {
	const refusal = record[place.error]
	if (!isRefusal(refusal)) return record
	const { [place.error]: _refusal, ...rest } = record
	return { ...rest, [place.total]: totalSentence(place.figure) }
}

/** One place's rewrite: the result's own total, or the record or each month it names. */
function placed(data: Record<string, unknown>, place: TotalPlace): Record<string, unknown> {
	const { within } = place
	if (within === undefined) return sentenceOf(data, place)
	const inner = data[within]
	if (within === "months") {
		if (!Array.isArray(inner)) return data
		return {
			...data,
			months: inner.map((month) => (isRecord(month) ? sentenceOf(month, place) : month)),
		}
	}
	return isRecord(inner) ? { ...data, [within]: sentenceOf(inner, place) } : data
}

/**
 * The human presentation of a result whose total is refused: the total's line states that it is not
 * stated and why, and the refusal's own fields stay in JSON. A month of `--monthly` and the Trial
 * Balance of `balance` are records of their own, so each is rewritten where it stands. A result
 * whose totals are stated is printed as it is.
 */
export function totalDisplay(
	...places: TotalPlace[]
): (data: Record<string, unknown>) => Record<string, unknown> {
	return (data) => {
		let shown = data
		for (const place of places) shown = placed(shown, place)
		return shown
	}
}
