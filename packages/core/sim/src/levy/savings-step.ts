import type { Levy, LevyContext, MinorUnits, SavingStop, Tallies } from "../types"
import type { InputProblem, ValueOverflowProblem } from "../types/projection"
import { evaluateMeasures } from "./evaluate"
import { withFunded } from "./savings-tallies"

/** What one search holds fixed, and the two counts every label draws on. */
export interface Scan {
	readonly levy: Levy
	readonly context: LevyContext
	readonly step: MinorUnits
	/** One major unit in minor units: a step whose last grain saves nothing went past its flat point. */
	readonly grain: MinorUnits
	/** The least fall in `due`, in minor units, that a step may save and still be taken. */
	readonly minSaving: bigint
	readonly maxSteps: number
	taken: number
	/** The budget left; undefined means no budget. */
	budget: MinorUnits | undefined
}

export type Problem = ValueOverflowProblem | InputProblem

/** One trial step: taken (with the Tallies and `due` it leaves), not taken and why, or refused. */
export type Trial =
	| { readonly kind: "took"; readonly tallies: Tallies; readonly due: MinorUnits }
	| { readonly kind: "stopped"; readonly stoppedBy: SavingStop }
	| { readonly kind: "refused"; readonly problem: Problem }

/** Why a step that cuts `due` by `fall` is not taken, or undefined when it is. */
function refusedFor(scan: Scan, fall: bigint): SavingStop | undefined {
	if (fall <= 0n) return "noSaving"
	if (fall < scan.minSaving) return "belowMinSaving"
	if (scan.budget !== undefined && scan.budget < scan.step) return "budget"
	return undefined
}

/** Tries one more step of `label` on `tallies`, which stand at `funded` and `due`. */
export function tryStep(
	scan: Scan,
	tallies: Tallies,
	label: string,
	funded: MinorUnits,
	due: MinorUnits,
): Trial {
	const trial = withFunded(tallies, label, funded + scan.step)
	const next = evaluateMeasures(scan.levy, trial, scan.context)
	if (!next.ok) return { kind: "refused", problem: next.problem }
	const stoppedBy = refusedFor(scan, BigInt(due) - BigInt(next.due))
	if (stoppedBy !== undefined) return { kind: "stopped", stoppedBy }
	if (scan.taken === scan.maxSteps) {
		return { kind: "refused", problem: { code: "TOO_MANY_STEPS", path: ["maxSteps"] } }
	}
	scan.taken += 1
	if (scan.budget !== undefined) scan.budget -= scan.step
	return { kind: "took", tallies: trial, due: next.due }
}

/**
 * Whether the step that ended at `funded` (with `due`) went past its flat point: the same Levy with
 * one grain less funded owes the same `due`, so that grain saved nothing. One evaluation.
 */
export function pastFlatPoint(
	scan: Scan,
	tallies: Tallies,
	label: string,
	funded: MinorUnits,
	due: MinorUnits,
):
	| { readonly ok: true; readonly past: boolean }
	| { readonly ok: false; readonly problem: Problem } {
	const probe = evaluateMeasures(
		scan.levy,
		withFunded(tallies, label, funded - scan.grain),
		scan.context,
	)
	return probe.ok ? { ok: true, past: probe.due === due } : { ok: false, problem: probe.problem }
}

/** Gives a dropped step back to the step count and to the budget. */
export function giveBack(scan: Scan): void {
	scan.taken -= 1
	if (scan.budget !== undefined) scan.budget += scan.step
}
