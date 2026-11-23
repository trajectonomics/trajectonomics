import type { LabelSaving, MinorUnits, Tallies } from "../types"
import { giveBack, type Problem, pastFlatPoint, type Scan, type Trial, tryStep } from "./savings-step"

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

/** The steps a label took, the Tallies and `due` it stands at, and those before its last step. */
interface Walk {
	readonly standing: Standing
	readonly before: Standing | undefined
	readonly extra: number
	readonly trial: Exclude<Trial, { readonly kind: "took" }>
}

function walk(scan: Scan, start: Tallies, label: string, dueFrom: MinorUnits): Walk {
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
	return { standing, before, extra, trial }
}

/**
 * Raises one label's `funded` tally by whole steps while each step pays. Trying a step past
 * `maxSteps` is allowed once, and the label refuses with `TOO_MANY_STEPS` if it still holds more than
 * `maxSteps` steps after the last step is dealt with, so no answer is a guess cut short. A label that
 * stops for want of saving drops its last step when that step's last grain saved nothing (it went
 * past a cap, or past where `due` stops falling, such as the end of taxable income or a rounding
 * flat point); the Tallies, `due`, count and budget go back to before it.
 */
export function scanLabel(scan: Scan, start: Tallies, label: string, dueFrom: MinorUnits): Scanned {
	const planned = start.funded.get(label) ?? 0
	const walked = walk(scan, start, label, dueFrom)
	const { trial, before } = walked
	if (trial.kind === "refused") return { ok: false, problem: trial.problem }
	let { standing, extra } = walked
	if (before !== undefined && trial.stoppedBy === "noSaving") {
		const probe = pastFlatPoint(scan, standing.tallies, label, planned + extra, standing.due)
		if (!probe.ok) return probe
		if (probe.past) {
			standing = before
			extra -= scan.step
			giveBack(scan)
		}
	}
	if (scan.taken > scan.maxSteps) {
		return { ok: false, problem: { code: "TOO_MANY_STEPS", path: ["maxSteps"] } }
	}
	const saving = BigInt(dueFrom) - BigInt(standing.due)
	if (saving > BigInt(Number.MAX_SAFE_INTEGER)) {
		return { ok: false, problem: { code: "VALUE_OVERFLOW", date: scan.context.date } }
	}
	const entry = { label, plannedFunded: planned, extra, saving: Number(saving) }
	return { ok: true, ...standing, entry: { ...entry, stoppedBy: trial.stoppedBy } }
}
