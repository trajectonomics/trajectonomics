import type { Emit, Path } from "./codes"
import { isRecord } from "./shape"

/** Account ids in `cashflow.withdraw`, or none when the list is unusable. */
function withdrawIds(cashflow: unknown): ReadonlySet<string> {
	const list = isRecord(cashflow) ? cashflow["withdraw"] : undefined
	const ids = new Set<string>()
	if (!Array.isArray(list)) return ids
	for (const item of list) if (typeof item === "string") ids.add(item)
	return ids
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
