/**
 * What `POST /what-if` answers: the four reads of the what-if, each a Read as the Snapshot holds one, or the
 * error envelope of a refused request. Pure: the client parses the answer, and the bar shows each failed read
 * and the change it names.
 */
import { z } from "zod"
import { type ErrorBody, errorBody, readOf } from "../contract"
import type { WhatIf } from "./session"

const anyRead = readOf(z.unknown())

/** The answer to a what-if: its four reads, or the refusal as data. */
export const whatIfAnswer = z.discriminatedUnion("ok", [
	z.strictObject({
		ok: z.literal(true),
		reads: z.strictObject({
			projection: anyRead,
			fi: anyRead,
			compare: anyRead,
			chance: anyRead.nullable(),
		}),
	}),
	z.strictObject({ ok: z.literal(false), error: errorBody }),
])

/** One what-if answer, parsed. */
export type WhatIfAnswer = z.infer<typeof whatIfAnswer>

/** One read that failed, with the read's name and its error. */
export type FailedRead = { read: "projection" | "fi" | "compare" | "chance"; error: ErrorBody }

/** The reads of an answer that failed, in the order the bar names them. A refused request has none. */
export function failedReads(answer: WhatIfAnswer): FailedRead[] {
	if (!answer.ok) return []
	const entries: [FailedRead["read"], { ok: boolean; error?: ErrorBody } | null][] = [
		["projection", answer.reads.projection],
		["fi", answer.reads.fi],
		["compare", answer.reads.compare],
		["chance", answer.reads.chance],
	]
	return entries.flatMap(([read, value]) =>
		value !== null && !value.ok && value.error !== undefined ? [{ read, error: value.error }] : [],
	)
}

/**
 * The path of the Set or Removal a refusal names, from its `details.path` (cli ADR 0056 names the Override
 * at fault), or null when the refusal names none. The bar shows the refusal at that change.
 */
export function pathNamed(error: ErrorBody): string | null {
	const details = error.details
	if (typeof details !== "object" || details === null || !("path" in details)) return null
	return typeof details.path === "string" ? details.path : null
}

/** Whether a change of the session is the one a refusal names. */
export function namesChange(error: ErrorBody, whatIf: WhatIf, path: string): boolean {
	return (
		pathNamed(error) === path &&
		(whatIf.removals.includes(path) || whatIf.sets.some((set) => set.path === path))
	)
}
