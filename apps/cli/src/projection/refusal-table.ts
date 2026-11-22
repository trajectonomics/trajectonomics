import type { ErrorCode, ProjectionProblem } from "@trajectonomics/core/sim"
import { OVERFLOW_HINT, overflowOf, overflowSentence } from "./overflow"
import { ELSEWHERE, type Elsewhere } from "./refusal-elsewhere"

/**
 * A refusal the engine raises that the CLI states in words: a sentence, and a hint where one fix is
 * known. The sentence may name what the problem carries (the date, the Account).
 */
type Said = {
	message: string | ((problem: ProjectionProblem) => string)
	hint?: string
}

export type RefusalEntry = Said | Elsewhere

/** A Baseline Account the Scenario does not declare is the one refusal a template repairs (ADR-0044). */
const DECLARE_HINT =
	'Run "traj scenario apply --template --as-of <date>" to print a Scenario that declares every asset and liability Account.'

const CARRY_IN_HINT =
	"A Levy's Carry-in comes from --carry-in, whose document is shown by traj schema projection run: one record per Levy and period the As-of leaves open."

/**
 * Every engine problem code, once: the sentence the CLI gives a refusal that carries it, or the
 * place that answers it instead. `refusal-table.test.ts` fails when the engine gains a code this
 * table covers in neither list (#298).
 */
export const REFUSALS: Readonly<Partial<Record<ErrorCode, RefusalEntry>>> = {
	// What only a run against the Ledger and the flags can find.
	UNDECLARED_BALANCE_ACCOUNT: {
		message: "The Ledger holds a balance on an Account the Scenario does not declare.",
		hint: DECLARE_HINT,
	},
	MISSING_BASIS: {
		message:
			"An Account with a gainLabel has a positive opening balance, and the Baseline states no opening basis for it.",
		hint: 'The Ledger\'s Baseline carries no basis, so remove "gainLabel" from that Account, or open the plan with a zero balance there.',
	},
	VALUE_OVERFLOW: {
		message: (problem) => {
			const found = overflowOf([problem])
			return found === undefined
				? "A figure grew past the largest amount the engine can hold."
				: overflowSentence(found)
		},
		hint: OVERFLOW_HINT,
	},
	DERIVED_EXPENSE_READS_EARNED: {
		message:
			"A derived expense reads earned income, directly or through another derived Flow. Earned income stops at the FI date, so the expense would fall to 0 there and FI would come too early.",
		hint: "Give that expense a fixed amount, or derive it from a Flow that is not earned income, then run fi again. projection run does not refuse it.",
	},
	DERIVED_DEBT_PAYMENT_READS_EARNED: {
		message:
			"A derived contribution into a liability reads earned income, directly or through another derived Flow. Earned income stops at the FI date, so the debt payment would fall to 0 there and the debt would go unpaid.",
		hint: "Give that payment a fixed amount, or derive it from a Flow that is not earned income, then run fi again. projection run does not refuse it.",
	},
	// A Levy's Carry-in is placed at projection time, so the engine can still find it wanting.
	MISSING_CARRY_IN: {
		message:
			"A Levy has no Carry-in record for a period the As-of leaves open, so what it had already tallied is unknown.",
		hint: CARRY_IN_HINT,
	},
	DUPLICATE_CARRY_IN: {
		message: "A Levy has two Carry-in records for the same period.",
		hint: CARRY_IN_HINT,
	},
	MISALIGNED_CARRY_IN: {
		message:
			"A Carry-in record's periodStart is not the month and day its Levy's period starts on.",
		hint: CARRY_IN_HINT,
	},
	UNKNOWN_TALLY_LABEL: {
		message: "A Carry-in tally states a label and basis that no Measure of its Levy reads.",
		hint: CARRY_IN_HINT,
	},
	UNSUPPLIED_TALLY_LABEL: {
		message:
			"A Levy reads tallies that no Flow, Account or Carry-in record supplies, so its tax would always be 0.",
		hint: 'Give an income Flow the label the Levy reads (it tallies as "gross"), or state that tally in --carry-in.',
	},
	...ELSEWHERE,
}

/** The sentence and hint for a problem, or `undefined` when the CLI has none for its code. */
export function sentenceFor(
	problem: ProjectionProblem,
): { message: string; hint?: string } | undefined {
	const entry = REFUSALS[problem.code]
	if (entry === undefined || !("message" in entry)) return undefined
	const message = typeof entry.message === "string" ? entry.message : entry.message(problem)
	return entry.hint === undefined ? { message } : { message, hint: entry.hint }
}
