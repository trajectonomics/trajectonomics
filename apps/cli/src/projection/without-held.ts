import type { Baseline } from "@trajectonomics/core/sim"
import { type AppError, fail, isAppError } from "../errors"
import { formatPath } from "../scenario/path"
import { parsePath } from "../scenario/set-parse"

/**
 * The refusal for a `--without` that takes out an Account the Ledger holds a balance in. The
 * Baseline is the Ledger's, so a what-if cannot drop the Account and keep the balance; the engine would
 * refuse the document as `UNDECLARED_BALANCE_ACCOUNT` at the Baseline, which says nothing of the flag
 * that caused it (cli ADR-0056). Null when no removal names such an Account.
 */
export function withoutHeldAccount(
	without: readonly string[],
	baseline: Baseline,
): AppError | null {
	for (const [index, raw] of without.entries()) {
		const segments = parsePath(raw, index, "without")
		if (isAppError(segments)) continue
		const [list, id] = segments
		if (list !== "accounts" || id === undefined || segments.length !== 2) continue
		const held = baseline.balances.findIndex((balance) => balance.account === id)
		if (held === -1) continue
		const path = formatPath(segments)
		return fail("projection_refused", {
			path: "--without",
			message: `The Ledger holds a balance in ${path}, so --without cannot take it out of the Scenario.`,
			hint: "Keep the Account in the Scenario and change its terms with --set; a what-if cannot drop an Account the Ledger holds a balance in.",
			details: [{ code: "UNDECLARED_BALANCE_ACCOUNT", path: `baseline.balances.${held}.account` }],
		})
	}
	return null
}
