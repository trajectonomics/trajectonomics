import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import { perYear, type RulePay } from "../engine/rule-book"
import type { Period } from "../output/periods"
import type { MinorUnits, Scenario } from "../types"
import type { ProjectionProblem } from "../types/projection"

export type SpentResult =
	| {
			readonly ok: true
			readonly spent?: readonly MinorUnits[]
			readonly lowest?: MinorUnits
	  }
	| { readonly ok: false; readonly problem: ProjectionProblem }

/**
 * What one Occurrence paid. On the date the run ran out the day's expenses were met only up to
 * `expense − unmet`, and each Occurrence gets that same share of its own planned amount, floored, so the
 * figure never exceeds what was met. `unmet` is the whole day across every expense, so it is split by
 * Flow here and never subtracted from one Flow's amount (ADR 0024).
 */
function paid(run: EngineRun, pay: RulePay): bigint {
	const out = run.runsOut
	if (out === undefined || pay.date !== out.date) return pay.amount
	const expense = run.totals[run.totals.length - 1]!.expense
	const met = expense - out.unmet
	return met <= 0n ? 0n : (met * pay.amount) / expense
}

/** Adds one rule Flow's Occurrences to `sums`, and records how many it landed in each roll-up. */
function addFlow(
	run: EngineRun,
	pays: readonly RulePay[],
	grid: readonly Period[],
	sums: bigint[],
): number[] {
	const counts = grid.map(() => 0)
	let at = 0
	for (const pay of pays) {
		while (at < grid.length - 1 && grid[at]!.to < pay.date) at++
		sums[at] = sums[at]! + paid(run, pay)
		counts[at]!++
	}
	return counts
}

/** A roll-up counts toward the lowest year when each rule Flow that paid in it paid a whole year of Occurrences. */
function wholeYears(
	counts: readonly (readonly number[])[],
	perYears: readonly number[],
): boolean[] {
	return (counts[0] ?? []).map((_, at) => {
		const paying = counts.flatMap((flow, index) =>
			flow[at]! > 0 ? [[flow[at]!, perYears[index]!]] : [],
		)
		return paying.length > 0 && paying.every(([count, whole]) => count === whole)
	})
}

/**
 * What the rule Flows paid in each Annual roll-up of `grid`: the sum over every rule Flow of what its
 * Occurrences paid on dates inside the roll-up. A run that ran out has no Occurrence after its end
 * date, so every later roll-up is 0, and the roll-up it ran out in counts what was paid before and on it.
 * `lowest` is the path's lowest year (ADR 0024): 0 for a path that ran out, wherever it did; otherwise
 * the least of the roll-ups that hold a whole year of Occurrences for each rule Flow that paid in them,
 * and absent when there is none. `spent` is absent for a Scenario without a rule Flow.
 */
export function spentBy(run: EngineRun, scenario: Scenario, grid: readonly Period[]): SpentResult {
	const { rules } = run
	if (rules === undefined) return { ok: true }
	const sums = grid.map(() => 0n)
	const flows = scenario.flows.filter((flow) => rules.has(flow.id))
	const counts = flows.map((flow) => addFlow(run, rules.get(flow.id)!.pays ?? [], grid, sums))
	const bad = sums.findIndex((sum) => !isSafeInteger(sum))
	if (bad >= 0) return { ok: false, problem: overflow(grid[bad]!.to) }
	const spent = sums.map(Number)
	const whole = wholeYears(counts, flows.map(perYear))
	const lows = spent.filter((_, at) => whole[at]).sort((a, b) => a - b)
	const lowest = run.runsOut === undefined ? lows[0] : 0
	return { ok: true, spent, ...(lowest === undefined ? {} : { lowest }) }
}
