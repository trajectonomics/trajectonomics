/**
 * Whether an error is the CLI's own words, which alone the page marks as `data-cli`. The loopback server's
 * refusals are the page's words: the request guards ([guard.ts](guard.ts)), a taken name (`serve-apply.ts`), a
 * body it cannot read (`serve-edit-answer.ts`), an Account it does not hold (`serve-record-values.ts`), a CLI
 * it cannot start (`run-traj.ts`), and a holder swap (`tax-swap.ts`). So are the Dashboard's own Reads
 * (`contract_mismatch`, `unparsed_error`), its parameters' codes and a preview it cannot send (`unreachable`).
 */
import type { ErrorBody } from "../contract"
import { CONTRACT_MISMATCH } from "../snapshot/decode-read"

/** The error codes the Dashboard's own server or client answers with, never the CLI. */
export const SERVER_CODES: ReadonlySet<string> = new Set([
	"method_not_allowed",
	"bad_host",
	"bad_origin",
	"bad_token",
	"unsupported_media_type",
	"not_ready",
	"edit_running",
	"invalid_edit",
	"invalid_what_if",
	"invalid_reread",
	"no_accounts",
	"unknown_account",
	"tax_claims_recorded_elsewhere",
	"traj_unavailable",
	"port_unavailable",
	"unreachable",
	"no_chance",
	"unknown_plan",
	"no_chance_read",
	"chance_changed",
	"invalid_path_index",
	"path_of_another_run",
	"unparsed_error",
	CONTRACT_MISMATCH,
	"as_of_required",
	"invalid_as_of",
	"horizon_required",
	"invalid_horizon",
	"horizon_before_as_of",
	"compare_needs_two_names",
	"invalid_birth_date",
	"age_needs_birth_date",
	"invalid_age",
	"invalid_allowances",
	"chance_needs_paths_and_seed",
	"invalid_return_model",
	"invalid_paths",
	"invalid_seed",
])

/** What `isCliError` reads of an error: its words, whatever else an answer carries beside them. */
type ErrorWords = Pick<ErrorBody, "code" | "exitCode" | "message" | "path">

/**
 * Whether an error is the CLI's own, so a page may mark it as the CLI's text. Null is no error.
 * `scenario_name_taken` is both: the CLI names its `path` as `name`, and the server's own refusal of a
 * new plan (`serve-apply.ts`) names none.
 */
export function isCliError(error: ErrorWords | null): boolean {
	if (error === null) return false
	if (error.code === "scenario_name_taken") return error.path === "name"
	return !SERVER_CODES.has(error.code)
}
