import type { Emit, Path } from "./codes"
import { checkLevelLoan } from "./level-loan"
import type { LoanIndex } from "./loan-index"

function checkWithdrawalSource(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	const source = flow["source"]
	if (typeof source !== "string" || index.get(source)?.kind !== "asset") return
	emit("WITHDRAWAL_SOURCE_KIND", [...path, "source"])
}

/** The loan rules of one Flow: a withdrawal borrows from a liability, a `level` payment is priced. */
export function checkLoanFlow(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	if (flow["kind"] === "withdrawal") checkWithdrawalSource(flow, path, index, emit)
	if (flow["kind"] === "contribution" && Object.hasOwn(flow, "level")) {
		checkLevelLoan(flow, path, index, emit)
	}
}
