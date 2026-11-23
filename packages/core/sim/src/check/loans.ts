import type { Emit, Path } from "./codes"
import { checkLevelLoan } from "./level-loan"
import type { LoanIndex } from "./loan-index"

/** The loan rule of one Flow: a `level` payment is priced. */
export function checkLoanFlow(
	flow: Readonly<Record<string, unknown>>,
	path: Path,
	index: LoanIndex,
	emit: Emit,
): void {
	if (flow["kind"] === "contribution" && Object.hasOwn(flow, "level")) {
		checkLevelLoan(flow, path, index, emit)
	}
}
