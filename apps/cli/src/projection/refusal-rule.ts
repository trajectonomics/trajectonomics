import type { ErrorCode } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"

/**
 * The sentences for a Spending rule (sim ADR 0023, cli ADR-0063). The document check alone finds them,
 * so `scenario apply` and the Store state them too (scenarioDocumentError), as well as `projection run`
 * on a stored row. A refusal through `--set` or `--add` states the code, then the sentence (cli ADR-0065). Each says what is wrong in the plan's own words and names the way out.
 */
export const SAID_RULE: Readonly<Partial<Record<ErrorCode, Said>>> = {
	RULE_NOT_EXPENSE: {
		message:
			"A spending rule sets how much an expense spends each year, and this Flow is not an expense.",
		hint: 'Give the Flow "kind": "expense", or state an amount, derive or level instead of a rule.',
	},
	RULE_PORTFOLIO_LIABILITY: {
		message:
			"A spending rule's portfolio names a liability, and a rule reads what savings are worth, not what is owed.",
		hint: "List only asset Accounts in the rule's portfolio.",
	},
	RULE_PORTFOLIO_ILLIQUID: {
		message:
			"A spending rule's portfolio names an Account marked liquid: false, which could not pay what the rule sets.",
		hint: "List only liquid asset Accounts in the rule's portfolio, or take liquid: false off the Account.",
	},
	RULE_FREQUENCY: {
		message:
			"A spending rule pays a year in twelve monthly parts or in one annual part, and this Flow is neither monthly nor annual.",
		hint: 'Set the Flow\'s "frequency" to "monthly" or "annual".',
	},
	RULE_FLOOR_ABOVE_CEILING: {
		message:
			"A spending rule's floor is above its ceiling, so no year could pay an amount between them.",
		hint: "Lower the floor's amount or raise the ceiling's, so the floor is no more than the ceiling.",
	},
	NEXT_12_MONTHS_READS_ACCOUNT: {
		message:
			"A Milestone's next12Months expense Metric reads a Flow whose amount follows an Account's value, which a window that has not been walked cannot price. A spending rule is one: it carries last year's amount.",
		hint: 'Use "trailing12Months" for that Metric. A spending rule Flow whose "startAt" names the Milestone the Metric sits on is accepted, because it is priced at 0 until the Milestone fires; a derived amount is accepted when no Flow or cashflow step changes the Account it reads.',
	},
}
