import { isSafeInteger, overflow } from "../engine/overflow"
import type { EngineRun } from "../engine/result"
import type { RulePay } from "../engine/rule-book"
import type { Period } from "../output/periods"
import type { MinorUnits } from "../types"
import type { ProjectionProblem } from "../types/projection"

export type SpentResult =
	| { readonly ok: true; readonly spent?: readonly MinorUnits[] }
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

/**
 * What the rule Flows paid in each Annual roll-up of `grid`: the sum over every rule Flow of what its
 * Occurrences paid on dates inside the roll-up. A run that ran out has no Occurrence after its end
 * date, so every later roll-up is 0, and the roll-up it ran out in counts what was paid before and on it.
 * `spent` is absent for a Scenario without a rule Flow.
 */
export function spentBy(run: EngineRun, grid: readonly Period[]): SpentResult {
	if (run.rules === undefined) return { ok: true }
	const sums = grid.map(() => 0n)
	for (const flow of run.rules.values()) {
		let at = 0
		for (const pay of flow.pays ?? []) {
			while (at < grid.length - 1 && grid[at]!.to < pay.date) at++
			sums[at] = sums[at]! + paid(run, pay)
		}
	}
	const bad = sums.findIndex((sum) => !isSafeInteger(sum))
	if (bad >= 0) return { ok: false, problem: overflow(grid[bad]!.to) }
	return { ok: true, spent: sums.map(Number) }
}
