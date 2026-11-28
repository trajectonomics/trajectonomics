/**
 * The stop step's one answer: the age the holder stops working, which the household anchors the `stop-work`
 * Milestone to ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * Pure: the typed text and the holder's life expectancy in, the problem (or none) out.
 */

/** Whole years only, as the household states a life expectancy. */
const WHOLE = /^\d{1,3}$/

/** Why the typed age cannot be the stop-work age, or null when it can. */
export function ageProblem(text: string, holderLifeExpectancy: number | null): string | null {
	const age = text.trim()
	if (!WHOLE.test(age)) return "Enter the age in whole years."
	if (holderLifeExpectancy === null) return null
	return Number(age) < holderLifeExpectancy
		? null
		: `Choose an age before your life expectancy (${holderLifeExpectancy}).`
}
