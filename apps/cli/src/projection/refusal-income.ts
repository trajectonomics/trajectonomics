import type { ErrorCode, ProjectionProblem } from "@trajectonomics/core/sim"
import type { Said } from "./refusal-said"

/**
 * The sentence for an Account's labels (sim ADR 0027, cli ADR-0067). One code names two mistakes, told
 * apart by the path the engine blames: a payout's `label` beside `returnLabel`, which would tally the same
 * money twice, and `returnLabel` beside `gainLabel`. The document check alone finds it, so
 * `scenario apply`, the Store and `--set` state it too, as well as `projection run` on a stored row.
 */
function payoutLabel(problem: ProjectionProblem): boolean {
	return "path" in problem && problem.path.includes("payout")
}

export const SAID_INCOME: Readonly<Partial<Record<ErrorCode, Said>>> = {
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
