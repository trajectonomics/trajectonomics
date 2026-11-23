import {
	type ErrorCode,
	MAX_LEVEL_PAYMENTS,
	type ProjectionProblem,
} from "@trajectonomics/core/sim"
import { OVERFLOW_HINT, overflowOf, overflowSentence } from "./overflow"
import { SAID_RULE } from "./refusal-rule"
import { SAID_TRADE } from "./refusal-trade"

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
	...SAID_TRADE,
	...SAID_RULE,
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
	// The loan rules are found by the document check alone, so `scenario apply` and the Store state
	// these sentences too (scenarioDocumentError), as well as `projection run` on a stored row.
	LEVEL_TARGET_NOT_LIABILITY: {
		message: "A level payment repays a loan, and its target Account is not a liability.",
		hint: "Name a liability Account with a compounding period as the target, or state the Flow as a fixed amount.",
	},
	LEVEL_TARGET_NOT_NOMINAL: {
		message:
			"A level payment is priced at a nominal rate, and its target liability states no compounding period.",
		hint: 'Give the liability a "compounding" period, such as "monthly", or state the Flow as a fixed amount.',
	},
	LEVEL_FREQUENCY_MISMATCH: {
		message:
			"A level payment falls once per compounding period, and this Flow's frequency is not the target's.",
		hint: "Set the Flow's frequency to the target's compounding period. A semiannual target has no matching frequency, so its loan cannot be a level payment.",
	},
	LEVEL_PAYMENTS_OUT_OF_RANGE: {
		message: `The payments of a level loan must be a whole number from 1 to ${MAX_LEVEL_PAYMENTS}.`,
		hint: "Give the number of equal payments as a whole number within that bound.",
	},
	LEVEL_PAYMENT_OVERFLOW: {
		message: "A level payment is too large to state as a whole number of minor units.",
		hint: "Lower the principal, or spread it over more payments.",
	},
	// An estate block is part of the Scenario, so `scenario apply` and the Store state this sentence too.
	ESTATE_ACCOUNT_LIABILITY: {
		message:
			"An estate cost names a liability Account, and a share of a cost is taken from asset Accounts only.",
		hint: 'Name asset Accounts in "of.accounts", or use "gross" to take a share of every asset. A debt is already taken off as "debts".',
	},
}
