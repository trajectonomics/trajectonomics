import type { LabelSaving, MinorUnits, Tallies } from "../types"
import { giveBack, type Problem, pastFlatPoint, type Scan, tryStep } from "./savings-step"

export type { Scan } from "./savings-step"

export type Scanned =
	| {
			readonly ok: true
			readonly tallies: Tallies
			readonly due: MinorUnits
			readonly entry: LabelSaving
	  }
	| { readonly ok: false; readonly problem: Problem }

/** The Tallies and `due` a label stood at before its last taken step. */
interface Standing {
	readonly tallies: Tallies
	readonly due: MinorUnits
}

/**
 * Raises one label's `funded` tally by whole steps while each step pays. Taking a step past
 * `maxSteps` refuses with `TOO_MANY_STEPS`, so no answer is a guess cut short. A label that stops
 * for want of saving drops its last step when that step's last grain saved nothing (it went past a
 * cap or the end of taxable income); the Tallies, `due`, count and budget go back to before it.
 */
export function scanLabel(scan: Scan, start: Tallies, label: string, dueFrom: MinorUnits): Scanned {
	const planned = start.funded.get(label) ?? 0
	let standing: Standing = { tallies: start, due: dueFrom }
	let before: Standing | undefined
	let extra = 0
	let trial = tryStep(scan, standing.tallies, label, planned, standing.due)
	while (trial.kind === "took") {
		before = standing
		standing = { tallies: trial.tallies, due: trial.due }
		extra += scan.step
		trial = tryStep(scan, standing.tallies, label, planned + extra, standing.due)
	}
	if (trial.kind === "refused") return { ok: false, problem: trial.problem }
	if (before !== undefined && trial.stoppedBy === "noSaving") {
		const probe = pastFlatPoint(scan, standing.tallies, label, planned + extra, standing.due)
		if (!probe.ok) return probe
		if (probe.past) {
			standing = before
			extra -= scan.step
			giveBack(scan)
		}
	}
	const saving = BigInt(dueFrom) - BigInt(standing.due)
	if (saving > BigInt(Number.MAX_SAFE_INTEGER)) {
		return { ok: false, problem: { code: "VALUE_OVERFLOW", date: scan.context.date } }
	}
	const entry = { label, plannedFunded: planned, extra, saving: Number(saving) }
	return { ok: true, ...standing, entry: { ...entry, stoppedBy: trial.stoppedBy } }
}
