import type { Levy, MinorUnits, SavingsOptions, SavingsResult, SettlementPeriod } from "../types"
import { evaluateMeasures } from "./evaluate"
import { settlementDueAfter } from "./periods"
import { badLabel, badOption } from "./savings-options"
import { type Scan, scanLabel } from "./savings-scan"
import { talliesOfPeriod } from "./savings-tallies"

/**
 * What raising each `funded` label by whole steps would take off a Settlement period's `due`, in the
 * caller's label order. `levy` must have passed `check()` and `period` is the Projection's report of
 * one of its periods. The Tallies are rebuilt from the period's reported `tally` Measures and
 * evaluated at the Due date with `options.inflation`, as the engine did. A label stops at the first
 * step that saves nothing, saves less than `minSavingBps` of a step, or does not fit the budget; one
 * that stops for want of saving drops its last step if that step's last `grain` saved nothing. The
 * next label starts from what the earlier ones left. Exceeding `maxSteps` in all, an out-of-range
 * option, an unread label, a period whose `due` this Levy does not reproduce (a wrong `inflation`,
 * or another Levy's period) and an overflow come back as `{ ok: false, problem }`.
 */
export function contributionSavings(
	levy: Levy,
	period: Pick<SettlementPeriod, "to" | "measures" | "due">,
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
	if (first.due !== period.due) {
		return { ok: false, problem: { code: "PERIOD_DUE_MISMATCH", path: ["period", "due"] } }
	}
	const minBps = BigInt(options.minSavingBps ?? 0)
	const scan: Scan = {
		levy,
		context,
		step: options.step,
		grain: options.grain,
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
