/**
 * Whether an Edit's error is the CLI's own words, which alone the page marks as `data-cli`. The loopback
 * server's refusals are the page's words: the request guards ([guard.ts](guard.ts)), a taken name
 * (`serve-apply.ts`), a body it cannot read (`serve-edit-answer.ts`), an Account it does not hold
 * (`serve-record-values.ts`), a CLI it cannot start (`run-traj.ts`), and a holder swap (`tax-swap.ts`).
 */
import type { ErrorBody } from "../contract"

/** The error codes the Dashboard's own server answers an Edit with, never the CLI. */
const SERVER_CODES: ReadonlySet<string> = new Set([
	"method_not_allowed",
	"bad_host",
	"bad_origin",
	"bad_token",
	"unsupported_media_type",
	"not_ready",
	"edit_running",
	"invalid_edit",
	"no_accounts",
	"unknown_account",
	"tax_claims_recorded_elsewhere",
	"traj_unavailable",
])

/**
 * Whether an Edit's error is the CLI's own, so a page may mark it as the CLI's text. Null is no error.
 * `scenario_name_taken` is both: the CLI names its `path` as `name`, and the server's own refusal of a
 * new plan (`serve-apply.ts`) names none.
 */
export function isCliError(error: ErrorBody | null): boolean {
	if (error === null) return false
	if (error.code === "scenario_name_taken") return error.path === "name"
	return !SERVER_CODES.has(error.code)
}
