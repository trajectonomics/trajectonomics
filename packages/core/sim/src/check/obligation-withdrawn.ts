import type { Emit, Path } from "./codes"
import { isRecord } from "./shape"
import { withdrawAccountIds } from "./withdraw-entries"

/** Account ids in `cashflow.withdraw`, or none when the list is unusable. */
function withdrawIds(cashflow: unknown): ReadonlySet<string> {
	return new Set(withdrawAccountIds(isRecord(cashflow) ? cashflow["withdraw"] : undefined))
}

/**
 * Emits `OBLIGATION_TARGET_WITHDRAWN` at the `target` of an obligation Contribution into an Account
 * that `cashflow.withdraw` lists. The obligation is booked into its target before the day's negative
 * net is drawn, so the draw could take the purchase price back out of the Account it just bought:
 * the purchase would pay for itself (ADR 0021). An illiquid target is left to `ILLIQUID_ROUTED`: it
 * already refuses the same `withdraw` entry, so the one mistake is reported once.
 */
export function checkObligationWithdrawn(
	flows: unknown,
	cashflow: unknown,
	illiquid: ReadonlySet<string>,
	path: Path,
	emit: Emit,
): void {
	const drawn = withdrawIds(cashflow)
	if (!Array.isArray(flows) || drawn.size === 0) return
	flows.forEach((flow: unknown, index) => {
		if (!isRecord(flow) || flow["kind"] !== "contribution" || flow["funding"] !== "obligation")
			return
		const target = flow["target"]
		if (typeof target === "string" && drawn.has(target) && !illiquid.has(target)) {
			emit("OBLIGATION_TARGET_WITHDRAWN", [...path, "flows", index, "target"])
		}
	})
}
