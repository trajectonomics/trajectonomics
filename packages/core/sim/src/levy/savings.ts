import type { Levy, MinorUnits, SavingsOptions, SavingsResult, SettlementPeriod } from "../types"
import type { InputProblem } from "../types/projection"
import { evaluateMeasures } from "./evaluate"
import { settlementDueAfter } from "./periods"
import { type Scan, scanLabel } from "./savings-scan"
import { fundedLabels, talliesOfPeriod } from "./savings-tallies"

const isCount = (value: unknown, least: number): boolean =>
	Number.isSafeInteger(value) && (value as number) >= least

function invalid(path: InputProblem["path"]): SavingsResult {
	return { ok: false, problem: { code: "INVALID_OPTION", path } }
}

/** The first option that is out of range, as a problem at its key. */
function badOption(options: SavingsOptions): SavingsResult | undefined {
	if (!isCount(options.step, 1)) return invalid(["step"])
	if (!isCount(options.maxSteps, 1)) return invalid(["maxSteps"])
	if (!Number.isSafeInteger(options.inflation)) return invalid(["inflation"])
	if (options.budget !== undefined && !isCount(options.budget, 0)) return invalid(["budget"])
	if (options.minSavingBps !== undefined && !isCount(options.minSavingBps, 0)) {
		return invalid(["minSavingBps"])
	}
	return undefined
}

/** The first label that no `funded` tally reads, or that repeats, as a problem at its index. */
function badLabel(levy: Levy, labels: readonly string[]): SavingsResult | undefined {
	const known = fundedLabels(levy)
	for (let index = 0; index < labels.length; index++) {
		const label = labels[index] ?? ""
		const path = ["labels", index]
		if (!known.has(label)) return { ok: false, problem: { code: "UNKNOWN_FUNDED_LABEL", path } }
		if (labels.indexOf(label) !== index) return invalid(path)
	}
	return undefined
}

/**
 * What raising each `funded` label by whole steps would take off a Settlement period's `due`, in the
 * caller's label order. `levy` must have passed `check()` and `period` is the Projection's report of
 * one of its periods. The Tallies are rebuilt from the period's reported `tally` Measures and
 * evaluated at the Due date with `options.inflation`, as the engine did. A label stops at the first
 * step that saves nothing, saves less than `minSavingBps` of a step, or does not fit the budget; the
 * next label starts from what the earlier ones left. Exceeding `maxSteps` in all, an out-of-range
 * option, an unread label and an overflow come back as `{ ok: false, problem }`.
 */
export function contributionSavings(
	levy: Levy,
	period: Pick<SettlementPeriod, "to" | "measures">,
	options: SavingsOptions,
): SavingsResult {
	const refused = badOption(options) ?? badLabel(levy, options.labels)
	if (refused !== undefined) return refused
	const context = {
		date: settlementDueAfter(period.to, levy.settlement),
		periodEnd: period.to,
		inflation: options.inflation,
	}
	let tallies = talliesOfPeriod(levy, period.measures)
	const first = evaluateMeasures(levy, tallies, context)
	if (!first.ok) return first
	const minBps = BigInt(options.minSavingBps ?? 0)
	const scan: Scan = {
		levy,
		context,
		step: options.step,
		minSaving: (BigInt(options.step) * minBps + 9999n) / 10000n,
		maxSteps: options.maxSteps,
		taken: 0,
		budget: options.budget,
	}
	let due: MinorUnits = first.due
	const labels = []
	for (const label of options.labels) {
		const scanned = scanLabel(scan, tallies, label, due)
		if (!scanned.ok) return scanned
		;({ tallies, due } = scanned)
		labels.push(scanned.entry)
	}
	return { ok: true, dueBefore: first.due, dueAfter: due, labels }
}
