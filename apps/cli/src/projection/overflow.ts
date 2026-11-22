import type { ProjectionProblem } from "@trajectonomics/core/sim"

/** The largest amount the engine represents, as a person reads it: 9,007,199,254,740,991 satang. */
const LIMIT = Number.MAX_SAFE_INTEGER.toLocaleString("en-US")

/**
 * The hint for a `VALUE_OVERFLOW`: each cause below is one an Account rate, a Flow growth or a
 * Flow amount really overflows with, and the tests drive every one through `projection run`.
 */
export const OVERFLOW_HINT =
	"The usual causes: a rate or growth far above basis points (500 is 5% a year, so 100000 is 1,000% and compounds past the limit within years); an amount in satang scaled by 100 a second time (amounts are satang, 100 per THB); or a long --horizon that lets a high rate run on. Check the Account and the Flows that feed it, then lower the figure or shorten --horizon."

/** The first overflow among the problems, or undefined when the engine refused for another reason. */
export function overflowOf(
	problems: readonly ProjectionProblem[],
): { date: string; account?: string } | undefined {
	const first = problems[0]
	if (first?.code !== "VALUE_OVERFLOW" || !("date" in first) || first.date === undefined) {
		return undefined
	}
	return "account" in first && first.account !== undefined
		? { date: first.date, account: first.account }
		: { date: first.date }
}

/**
 * The sentence for a `VALUE_OVERFLOW`. The engine reports the date it happened and, when one
 * Account's figure grew, which Account; a total or a settlement carries no Account.
 */
export function overflowSentence(problem: { date: string; account?: string }): string {
	const what =
		problem.account === undefined
			? "A total the engine computes"
			: `A figure in Account ${problem.account}`
	return `${what} grew past the largest amount it can hold (${LIMIT} satang) on ${problem.date}.`
}
