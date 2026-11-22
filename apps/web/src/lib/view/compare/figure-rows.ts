import type { ProjectionCompare } from "../../contract"
import type { Cell } from "./cell"
import { countDifference, moneyDifference } from "./cell"
import {
	AGE_REASON,
	ageCell,
	END_REASON,
	endCell,
	fiCell,
	fiReason,
	runOutCell,
	runOutReason,
} from "./figure-cells"

/** One figure of a compare: its name, side A, the CLI's difference (B minus A) and side B. */
export interface FigureRow {
	readonly key: string
	readonly label: string
	readonly a: Cell
	readonly difference: Cell
	readonly b: Cell
}

/** The figures of a compare, one row each. Every difference is the CLI's delta, never one computed here. */
export function figureRows(data: ProjectionCompare): readonly FigureRow[] {
	const { a, b } = data.sides
	const { deltas } = data
	return [
		{
			key: "fi",
			label: "FI date",
			a: fiCell(a.fi),
			difference: countDifference(deltas.fiMonths, "month", fiReason(data)),
			b: fiCell(b.fi),
		},
		{
			key: "final-nominal",
			label: "Net worth at the end, nominal",
			a: endCell(a, "nominal"),
			difference: moneyDifference(deltas.netWorth?.nominal ?? null, END_REASON),
			b: endCell(b, "nominal"),
		},
		{
			key: "final-real",
			label: "Net worth at the end, real",
			a: endCell(a, "real"),
			difference: moneyDifference(deltas.netWorth?.real ?? null, END_REASON),
			b: endCell(b, "real"),
		},
		...deltas.atAges.flatMap((delta, index) => ageRows(data, index, delta.age)),
		{
			key: "run-out",
			label: "Money runs out",
			a: runOutCell(a),
			difference: countDifference(deltas.runOutYears, "year", runOutReason(data)),
			b: runOutCell(b),
		},
	]
}

/** The nominal and real rows of one age the compare was asked for. */
function ageRows(data: ProjectionCompare, index: number, age: number): FigureRow[] {
	const delta = data.deltas.atAges[index]
	const sideA = data.sides.a.netWorth.atAges[index]
	const sideB = data.sides.b.netWorth.atAges[index]
	return [
		{
			key: `age-${age}-nominal`,
			label: `Net worth at age ${age}, nominal`,
			a: ageCell(sideA?.nominal),
			difference: moneyDifference(delta?.nominal ?? null, AGE_REASON),
			b: ageCell(sideB?.nominal),
		},
		{
			key: `age-${age}-real`,
			label: `Net worth at age ${age}, real`,
			a: ageCell(sideA?.real),
			difference: moneyDifference(delta?.real ?? null, AGE_REASON),
			b: ageCell(sideB?.real),
		},
	]
}
