import type { Flow, Levy } from "@trajectonomics/core/sim"
import type { AllowanceFlow } from "./allowances-flow-view"

/** The contribution labels one Levy reads, from its own `funded` tally Measures. */
export function fundedLabelsOf(levy: Levy): string[] {
	const labels: string[] = []
	for (const measure of levy.measures) {
		if (measure.op === "tally" && measure.basis === "funded" && !labels.includes(measure.label)) {
			labels.push(measure.label)
		}
	}
	return labels
}

/** `allowance.thai_esg` → `thai-esg`: the part of the label an id keeps. */
function suffixOf(label: string): string {
	return (label.split(".").at(-1) ?? label).replaceAll("_", "-")
}

/** Where a label's suggestion lands: the Account, or why there is none. */
export type Target = { target: string } | { target?: undefined; withdrawn: string[] }

/**
 * The Account the plan's first contribution with this label pays into, in Scenario order, that the
 * plan does not draw from: the engine refuses a lump sum into an Account in `cashflow.withdraw`
 * (sim ADR-0021, `OBLIGATION_TARGET_WITHDRAWN`). `withdrawn` names the ones skipped for that.
 */
export function targetOf(
	flows: readonly Flow[],
	label: string,
	withdraw: readonly string[],
): Target {
	const withdrawn: string[] = []
	for (const flow of flows) {
		if (flow.kind !== "contribution" || flow.label !== label) continue
		if (withdraw.includes(flow.target)) {
			if (!withdrawn.includes(flow.target)) withdrawn.push(flow.target)
			continue
		}
		return { target: flow.target }
	}
	return { withdrawn }
}

/** What one suggestion needs to become a Flow. */
export type FlowInput = {
	label: string
	amount: string
	to: string
	asOf: string
	target: string | undefined
	/** Every id the plan's flows and the earlier suggestions of the result already use. */
	taken: Set<string>
}

/** The later of two ISO dates. */
function later(a: string, b: string): string {
	if (a < b) return b
	return a
}

/** The id itself when free, else the first of `-2`, `-3`, ... after it that is; the id is then taken. */
function freeId(id: string, taken: Set<string>): string {
	let free = id
	for (let n = 2; taken.has(free); n += 1) free = `${id}-${n}`
	taken.add(free)
	return free
}

/**
 * The Flow that applies one suggestion. It lands on the 15th of the tax year's last month, so a
 * Calendar day rule cannot move it into the next tax year, or on the As-of when that is later, so
 * it is not dated before the Projection starts (cli ADR-0061).
 */
export function flowOf(input: FlowInput): AllowanceFlow {
	const fifteenth = `${input.to.slice(0, 7)}-15`
	const parts = [input.target, suffixOf(input.label), input.to.slice(0, 4)]
	return {
		id: freeId(parts.filter((part) => part !== undefined).join("-"), input.taken),
		kind: "contribution",
		funding: "obligation",
		frequency: "once",
		label: input.label,
		amount: input.amount,
		growth: { bps: 0 },
		start: later(fifteenth, input.asOf),
		...(input.target === undefined ? {} : { target: input.target }),
	}
}
