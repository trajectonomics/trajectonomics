import type { LabelSaving, Levy, LevyContext, MinorUnits, SavingStop, Tallies } from "../types"
import type { InputProblem, ValueOverflowProblem } from "../types/projection"
import { evaluateMeasures } from "./evaluate"
import { withFunded } from "./savings-tallies"

/** What one search holds fixed, and the two counts every label draws on. */
export interface Scan {
	readonly levy: Levy
	readonly context: LevyContext
	readonly step: MinorUnits
	/** The least fall in `due`, in minor units, that a step may save and still be taken. */
	readonly minSaving: bigint
	readonly maxSteps: number
	taken: number
	/** The budget left; undefined means no budget. */
	budget: MinorUnits | undefined
}

type Problem = ValueOverflowProblem | InputProblem

export type Scanned =
	| {
			readonly ok: true
			readonly tallies: Tallies
			readonly due: MinorUnits
			readonly entry: LabelSaving
	  }
	| { readonly ok: false; readonly problem: Problem }

/** One trial step: taken (with the Tallies and `due` it leaves), not taken and why, or refused. */
type Trial =
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
function tryStep(
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
 * Raises one label's `funded` tally by whole steps while each step pays. Taking a step past
 * `maxSteps` refuses with `TOO_MANY_STEPS`, so no answer is a guess cut short.
 */
export function scanLabel(scan: Scan, start: Tallies, label: string, dueFrom: MinorUnits): Scanned {
	const planned = start.funded.get(label) ?? 0
	let tallies = start
	let due = dueFrom
	let extra = 0
	let trial = tryStep(scan, tallies, label, planned, due)
	while (trial.kind === "took") {
		;({ tallies, due } = trial)
		extra += scan.step
		trial = tryStep(scan, tallies, label, planned + extra, due)
	}
	if (trial.kind === "refused") return { ok: false, problem: trial.problem }
	const saving = BigInt(dueFrom) - BigInt(due)
	if (saving > BigInt(Number.MAX_SAFE_INTEGER)) {
		return { ok: false, problem: { code: "VALUE_OVERFLOW", date: scan.context.date } }
	}
	return {
		ok: true,
		tallies,
		due,
		entry: {
			label,
			plannedFunded: planned,
			extra,
			saving: Number(saving),
			stoppedBy: trial.stoppedBy,
		},
	}
}
