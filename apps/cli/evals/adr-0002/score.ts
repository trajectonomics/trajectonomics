import type { Expected } from "./oracle"
import { TOLERANCE } from "./oracle"

/** The three figures a run's final answer must state. */
export interface Answer {
	readonly fiDate: string | null
	readonly tax2026Baht: number | null
	readonly whatIfFiDate: string | null
}

/** Per-question correctness for one run, plus whether the final answer parsed at all. */
export interface Correctness {
	readonly parsed: boolean
	readonly fi: boolean
	readonly tax: boolean
	readonly whatIf: boolean
}

/**
 * The last fenced ```json block of a final answer, read as the three figures. Null when there is
 * no such block or its values are the wrong types.
 */
export function parseAnswer(text: string): Answer | null {
	const blocks = [...text.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
	const last = blocks.at(-1)?.[1]
	if (last === undefined) return null
	let raw: unknown
	try {
		raw = JSON.parse(last)
	} catch {
		return null
	}
	if (typeof raw !== "object" || raw === null) return null
	const record = raw as Record<string, unknown>
	const date = (value: unknown): string | null | undefined => {
		if (value === null) return null
		return typeof value === "string" && /^\d{4}-\d{2}(-\d{2})?$/.test(value) ? value : undefined
	}
	const fiDate = date(record["fiDate"])
	const whatIfFiDate = date(record["whatIfFiDate"])
	const tax = record["tax2026Baht"]
	if (fiDate === undefined || whatIfFiDate === undefined) return null
	if (typeof tax !== "number" && tax !== null) return null
	return { fiDate, tax2026Baht: typeof tax === "number" ? tax : null, whatIfFiDate }
}

/** Calendar months from year zero, so `2026-09` and `2026-10` are one apart. */
function monthIndex(month: string): number {
	const [year, mon] = month.split("-")
	return Number(year) * 12 + Number(mon) - 1
}

/** Whether a stated FI date is within the tolerance of the oracle's month (both null also matches). */
export function fiMatches(given: string | null, expected: string | null): boolean {
	if (given === null || expected === null) return given === expected
	return Math.abs(monthIndex(given.slice(0, 7)) - monthIndex(expected)) <= TOLERANCE.fiMonths
}

/** Whether a stated tax is within the baht tolerance of the oracle's figure. */
export function taxMatches(given: number | null, expected: number): boolean {
	return given !== null && Math.abs(given - expected) <= TOLERANCE.taxBaht
}

/** Scores one run's final text against the oracle's answers. */
export function scoreCorrectness(finalText: string, expected: Expected): Correctness {
	const answer = parseAnswer(finalText)
	if (answer === null) return { parsed: false, fi: false, tax: false, whatIf: false }
	return {
		parsed: true,
		fi: fiMatches(answer.fiDate, expected.fiMonth),
		tax: taxMatches(answer.tax2026Baht, expected.tax2026Baht),
		whatIf: fiMatches(answer.whatIfFiDate, expected.whatIfFiMonth),
	}
}

/** How many of the three questions were correct. */
export function correctCount(correctness: Correctness): number {
	return [correctness.fi, correctness.tax, correctness.whatIf].filter(Boolean).length
}
