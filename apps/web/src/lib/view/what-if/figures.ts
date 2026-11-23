import type { ProjectionCompare } from "../../contract"
import {
	AGE_REASON,
	ageCell,
	END_REASON,
	endCell,
	fiCell,
	fiReason,
	runOutCell,
	runOutReason,
} from "../compare/figure-cells"
import { countChange, moneyChange } from "./change"
import type { Triple } from "./triple"

const HIGHER_LOWER = ["higher", "lower"] as const
const EARLIER_LATER = ["earlier", "later"] as const

/**
 * The headline figures of a what-if, from its compare: side A is the plan as stored (the baseline) and side B
 * the plan with the session's changes. Each change is the CLI's: `deltas.fiMonths`, `deltas.netWorth`,
 * `deltas.atAges` and `deltas.runOutYears`.
 */
export function figureTriples(data: ProjectionCompare): readonly Triple[] {
	const { a, b } = data.sides
	const { deltas } = data
	const ages = deltas.atAges.flatMap((delta, index) =>
		(["nominal", "real"] as const).map(
			(terms): Triple => ({
				key: `age-${delta.age}-${terms}`,
				label: `Net worth at age ${delta.age}, ${terms}`,
				whatIf: ageCell(b.netWorth.atAges[index]?.[terms]),
				baseline: ageCell(a.netWorth.atAges[index]?.[terms]),
				change: moneyChange(delta[terms], HIGHER_LOWER, AGE_REASON),
			}),
		),
	)
	return [
		{
			key: "fi",
			label: "FI date",
			whatIf: fiCell(b.fi),
			baseline: fiCell(a.fi),
			change: countChange(deltas.fiMonths, "month", EARLIER_LATER, fiReason(data)),
		},
		{
			key: "final-nominal",
			label: "Net worth at the end, nominal",
			whatIf: endCell(b, "nominal"),
			baseline: endCell(a, "nominal"),
			change: moneyChange(deltas.netWorth?.nominal, HIGHER_LOWER, END_REASON),
		},
		{
			key: "final-real",
			label: "Net worth at the end, real",
			whatIf: endCell(b, "real"),
			baseline: endCell(a, "real"),
			change: moneyChange(deltas.netWorth?.real, HIGHER_LOWER, END_REASON),
		},
		...ages,
		{
			key: "run-out",
			label: "Money runs out",
			whatIf: runOutCell(b),
			baseline: runOutCell(a),
			change: countChange(deltas.runOutYears, "year", EARLIER_LATER, runOutReason(data)),
		},
	]
}

/** One figure of the headline set, by key, for a card that shows only that one. */
export function figureOf(data: ProjectionCompare, key: string): Triple | null {
	return figureTriples(data).find((triple) => triple.key === key) ?? null
}
