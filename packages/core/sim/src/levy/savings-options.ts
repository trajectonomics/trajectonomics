import type { Levy, SavingsOptions, SavingsResult } from "../types"
import type { InputProblem } from "../types/projection"
import { fundedLabels } from "./savings-tallies"

const isCount = (value: unknown, least: number, most = Number.MAX_SAFE_INTEGER): boolean =>
	Number.isSafeInteger(value) && (value as number) >= least && (value as number) <= most

/** A refusal for an option at `path`. */
export function invalid(path: InputProblem["path"]): SavingsResult {
	return { ok: false, problem: { code: "INVALID_OPTION", path } }
}

/** The first option that is out of range, as a problem at its key. */
export function badOption(options: SavingsOptions): SavingsResult | undefined {
	if (!isCount(options.step, 1)) return invalid(["step"])
	// A grain as large as the step would turn the over-the-cap rule off: a taken step always saves
	// something, so its last grain never equals the whole step.
	if (!isCount(options.grain, 1, options.step - 1)) return invalid(["grain"])
	if (!isCount(options.maxSteps, 1)) return invalid(["maxSteps"])
	if (!Number.isSafeInteger(options.inflation)) return invalid(["inflation"])
	if (options.budget !== undefined && !isCount(options.budget, 0)) return invalid(["budget"])
	if (options.minSavingBps !== undefined && !isCount(options.minSavingBps, 0, 10_000)) {
		return invalid(["minSavingBps"])
	}
	return undefined
}

/** The first label that no `funded` tally reads, or that repeats, as a problem at its index. */
export function badLabel(levy: Levy, labels: readonly string[]): SavingsResult | undefined {
	const known = fundedLabels(levy)
	for (let index = 0; index < labels.length; index++) {
		const label = labels[index] ?? ""
		const path = ["labels", index]
		if (!known.has(label)) return { ok: false, problem: { code: "UNKNOWN_FUNDED_LABEL", path } }
		if (labels.indexOf(label) !== index) return invalid(path)
	}
	return undefined
}
