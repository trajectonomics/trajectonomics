/** Independent expectation for `contributionSavings`: every whole-step count tried, no incremental scan. */
import type { DateString, Levy } from "../types"
import { type OracleTallies, oracleMeasures } from "./oracle-measure"

export interface OracleSavingsInput {
	readonly levy: Levy
	readonly tallies: OracleTallies
	readonly date: DateString
	readonly periodEnd: DateString
	readonly inflation: number
	readonly labels: readonly string[]
	readonly step: bigint
	readonly budget: bigint | undefined
	readonly minSavingBps: bigint
	/** One major unit in minor units: a step whose last grain saves nothing went past its flat point. */
	readonly grain: bigint
	/** The most whole steps tried for one label; the cases keep every answer below it. */
	readonly reach: number
}

export interface OracleLabel {
	readonly label: string
	readonly steps: number
	readonly saving: bigint
	readonly stoppedBy: "noSaving" | "belowMinSaving" | "budget"
}

function dueWith(input: OracleSavingsInput, funded: Map<string, bigint>): bigint {
	const tallies = { ...input.tallies, funded }
	return oracleMeasures(input.levy, tallies, input.date, input.inflation, input.periodEnd).due
}

/** Ceiling of `step * bps / 10000`, counted up. */
function leastFall(step: bigint, bps: bigint): bigint {
	let least = 0n
	while (least * 10000n < step * bps) least += 1n
	return least
}

/** Why the step to `count` is not taken, or undefined when it is: it must save something, enough, and fit. */
function whyNot(fall: bigint, least: bigint, left: bigint | undefined, step: bigint) {
	if (fall <= 0n) return "noSaving"
	if (fall < least) return "belowMinSaving"
	return left !== undefined && left < step ? "budget" : undefined
}

/** How many leading steps are taken, and what stopped the next. */
function takenSteps(
	dues: readonly bigint[],
	input: OracleSavingsInput,
	budget: bigint | undefined,
): { readonly steps: number; readonly stoppedBy: OracleLabel["stoppedBy"] } {
	const least = leastFall(input.step, input.minSavingBps)
	let left = budget
	for (let count = 1; count <= input.reach; count++) {
		const fall = (dues[count - 1] ?? 0n) - (dues[count] ?? 0n)
		const stoppedBy = whyNot(fall, least, left, input.step)
		if (stoppedBy !== undefined) return { steps: count - 1, stoppedBy }
		if (left !== undefined) left -= input.step
	}
	throw new Error("reach is too small for this case")
}

/** Whether the last step, after a stop for want of saving, saved nothing in its last grain. */
function wentPast(
	input: OracleSavingsInput,
	funded: Map<string, bigint>,
	label: string,
	found: { readonly steps: number; readonly stoppedBy: OracleLabel["stoppedBy"] },
	dueAfter: bigint,
): boolean {
	if (found.steps === 0 || found.stoppedBy !== "noSaving") return false
	const planned = funded.get(label) ?? 0n
	const lessGrain = planned + BigInt(found.steps) * input.step - input.grain
	return dueWith(input, new Map(funded).set(label, lessGrain)) === dueAfter
}

/** The whole steps a label keeps: those taken, less the last when it went past its flat point. */
function keptSteps(
	input: OracleSavingsInput,
	funded: Map<string, bigint>,
	label: string,
	dues: readonly bigint[],
	taken: ReturnType<typeof takenSteps>,
): number {
	return wentPast(input, funded, label, taken, dues[taken.steps] ?? 0n)
		? taken.steps - 1
		: taken.steps
}

/** Per label in order: the due after 0..reach whole steps, then the first count whose step is not taken. */
export function oracleSavings(input: OracleSavingsInput): readonly OracleLabel[] {
	const funded = new Map(input.tallies.funded)
	let budget = input.budget
	const found: OracleLabel[] = []
	for (const label of input.labels) {
		const planned = funded.get(label) ?? 0n
		const dues: bigint[] = []
		for (let count = 0; count <= input.reach; count++) {
			dues.push(dueWith(input, new Map(funded).set(label, planned + BigInt(count) * input.step)))
		}
		const taken = takenSteps(dues, input, budget)
		const steps = keptSteps(input, funded, label, dues, taken)
		if (budget !== undefined) budget -= BigInt(steps) * input.step
		funded.set(label, planned + BigInt(steps) * input.step)
		const saving = (dues[0] ?? 0n) - (dues[steps] ?? 0n)
		found.push({ label, steps, saving, stoppedBy: taken.stoppedBy })
	}
	return found
}
