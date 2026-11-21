import { OPERATOR_TAB_CONTENT } from "./tabs"

/** One way an Operator page can disagree with the release snapshot; one code per rule (ADR 0015). */
export type ReleaseFactRule =
	| "command-missing"
	| "command-unknown"
	| "command-summary"
	| "exit-codes"
	| "retryable-codes"
	| "error-code-unknown"
	| "error-exit-code"
	| "env-var-missing"
	| "env-var-unknown"

/** An Operator page that states a fact the release does not, by rule, page and the fact itself. */
export interface ReleaseFactProblem {
	readonly rule: ReleaseFactRule
	readonly file: string
	readonly detail: string
}

/** The page whose table lists the top-level commands, and states the exit codes and retryable codes. */
export const COMMANDS_PAGE = `${OPERATOR_TAB_CONTENT}/commands/index.mdx`

/** The page with one `## NAME` section per environment variable the CLI reads. */
export const CONFIGURATION_PAGE = `${OPERATOR_TAB_CONTENT}/configuration.mdx`

/** A backticked token shaped like an error code: `ledger_missing` or `NON_EQUITY_CONTRA`. */
export const CODE_TOKEN = /`([a-z][a-z0-9]*(?:_[a-z0-9]+)+|[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)`/g

/** One problem of `rule` on `file`. */
export function problem(rule: ReleaseFactRule, file: string, detail: string): ReleaseFactProblem {
	return { rule, file, detail }
}
