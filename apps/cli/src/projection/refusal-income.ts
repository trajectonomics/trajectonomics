import type { ErrorCode, ProjectionProblem } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"
import { SAID_TRADE } from "./refusal-trade"

/** Whether `CONFLICTING_LABELS` blames a payout's `label` (beside `returnLabel`), not `returnLabel` beside `gainLabel`. */
function payoutLabel(problem: ProjectionProblem): boolean {
	return "path" in problem && problem.path.includes("payout")
}

/**
 * The sentences for buying and selling an asset (sim ADR 0021) and for an Account's labels (sim ADR
 * 0027, cli ADR-0067). `CONFLICTING_LABELS` names two mistakes, told apart by the path the engine blames.
 * The document check alone finds each, so `scenario apply`, the Store and `--set` state it too, as well
 * as `projection run` on a stored row.
 */
export const SAID_ACCOUNTS: Readonly<Partial<Record<ErrorCode, Said>>> = {
	...SAID_TRADE,
	CONFLICTING_LABELS: {
		message: (problem) =>
			payoutLabel(problem)
				? "An Account's payout carries a label beside the Account's returnLabel, and returnLabel already tallies the growth the payout is paid out of, so the same money would be tallied twice."
				: "An Account carries a returnLabel and a gainLabel, and one Account may not tally both its returns and its gains.",
		hint: (problem) =>
			payoutLabel(problem)
				? 'Keep the payout\'s "label" to tax what is paid out and remove "returnLabel", or keep "returnLabel" and remove the payout\'s "label".'
				: 'Keep "returnLabel" or "gainLabel" on that Account, and remove the other.',
	},
}
