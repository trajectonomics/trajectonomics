import type { ErrorCode, ProjectionProblem } from "@trajectonomics/core/sim"
import { OVERFLOW_HINT, overflowOf, overflowSentence } from "./overflow"

/**
 * A refusal the engine raises that the CLI states in words: a sentence, and a hint where one fix is
 * known. The sentence may name what the problem carries (the date, the Account).
 */
export type Said = {
	message: string | ((problem: ProjectionProblem) => string)
	hint?: string
}

/** A Baseline Account the Scenario does not declare is the one refusal a template repairs (ADR-0044). */
const DECLARE_HINT =
	'Run "traj scenario apply --template --as-of <date>" to print a Scenario that declares every asset and liability Account.'

const CARRY_IN_HINT =
	"A Levy's Carry-in comes from --carry-in, whose document is shown by traj schema projection run: one record per Levy and period the As-of leaves open."

/**
 * The sentence for each code the CLI words itself. `refusal-table.test.ts` fails when a code is in
 * both this table and `ELSEWHERE`, or in neither. A compile-time check is out of reach: it needs the
 * literal key type of both tables, and `isolatedDeclarations` makes an exported table state its type.
 */
export const SAID: Readonly<Partial<Record<ErrorCode, Said>>> = {
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
			"A derived expense reads earned income, directly or through another derived Flow. Earned income stops at the FI date, so the expense would drop when earned income stops and FI would come too early.",
		hint: "Give that expense a fixed amount, or derive it from a Flow that is not earned income, then run it again. traj fi and traj projection compare refuse it; traj projection run does not.",
	},
	DERIVED_DEBT_PAYMENT_READS_EARNED: {
		message:
			"A derived contribution into a liability reads earned income, directly or through another derived Flow. Earned income stops at the FI date, so the payment would drop when earned income stops and the debt would go unpaid.",
		hint: "Give that payment a fixed amount, or derive it from a Flow that is not earned income, then run it again. traj fi and traj projection compare refuse it; traj projection run does not.",
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
}
