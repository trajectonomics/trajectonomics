import type { Emit, Path } from "./codes"
import { chargingAccountId, feeFlowId } from "./fee"
import { payingAccountId, payoutFlowId } from "./payout"
import { isRecord } from "./shape"

/** The Flow ids the Accounts take: `payout:<account>` (ADR 0027) and `fee:<account>` (ADR 0028). */
function reservedIds(accounts: readonly unknown[]): ReadonlySet<string> {
	const taken = new Set<string>()
	for (const account of accounts) {
		const paying = payingAccountId(account)
		if (paying !== undefined) taken.add(payoutFlowId(paying))
		const charging = chargingAccountId(account)
		if (charging !== undefined) taken.add(feeFlowId(charging))
	}
	return taken
}

/**
 * Reports a declared Flow that carries an id the engine takes for an Account: `payout:<account>` for one
 * that pays out, `fee:<account>` for one that charges a fee. An Account at 0 bps takes nothing.
 */
export function checkReservedFlowIds(
	accounts: unknown,
	flows: unknown,
	path: Path,
	emit: Emit,
): void {
	if (!Array.isArray(accounts) || !Array.isArray(flows)) return
	const taken = reservedIds(accounts)
	for (let index = 0; index < flows.length; index++) {
		const flow: unknown = flows[index]
		if (isRecord(flow) && typeof flow["id"] === "string" && taken.has(flow["id"])) {
			emit("DUPLICATE_ID", [...path, "flows", index, "id"])
		}
	}
}
