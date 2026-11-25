/**
 * What each routing section did over the plan, from `projection run --breakdown` (cli ADR 0058, 0070): the money each step
 * filled, each entry drew, each saving took and each transfer moved, one point a year. Every point is the CLI's decimal
 * string; `toChartNumber` places its mark and nothing is added (web ADR 0002).
 */
import { type LinePoint, type LineSeries, toChartNumber } from "../../chart"
import type { ProjectionRun } from "../../contract"
import { formatMoney, isAboveZero } from "../../format"
import { type AccountNames, nameOf } from "../account-names"
import { annualRowsOf } from "../projection/annual"
import { type Entry, entryAccount } from "./entries"
import { entryWords, plainText } from "./words"

type Table = ProjectionRun["tables"][number]
type Line = Extract<Table, { name: "cashflow" }>["rows"][number]

/** One chart: its series, and a sentence for each year a transfer could not move all it planned. */
export interface Figure {
	readonly series: readonly LineSeries[]
	readonly notes: readonly string[]
}

/** One series for each key of the lines, named by `nameBy`; keyed by `keyOf`, named by `nameBy`; a year with no line has no point. */
function seriesOf<T extends { index: number; amount: string }>(
	run: ProjectionRun,
	lines: readonly T[],
	keyOf: (line: T) => string,
	nameBy: (line: T) => string,
): LineSeries[] {
	const years = new Map(annualRowsOf(run).map((row) => [row.index, row.to.slice(0, 4)]))
	const groups = new Map<string, { name: string; points: Map<number, LinePoint> }>()
	for (const line of lines) {
		const group = groups.get(keyOf(line)) ?? { name: nameBy(line), points: new Map() }
		group.points.set(line.index, {
			x: line.index,
			xLabel: years.get(line.index) ?? "",
			y: toChartNumber(line.amount),
			display: formatMoney(line.amount),
		})
		groups.set(keyOf(line), group)
	}
	return [...groups.values()].map((group) => ({
		name: group.name,
		points: [...group.points.values()],
	}))
}

function linesOf(run: ProjectionRun, group: Line["group"]): Line[] {
	return run.tables.flatMap((table) =>
		table.name === "cashflow" ? table.rows.filter((line) => line.group === group) : [],
	)
}

/** What each surplus step filled: a series for each Account the steps name. */
export function filledFigure(run: ProjectionRun, names: AccountNames): Figure {
	const lines = linesOf(run, "surplus")
	return {
		series: seriesOf(
			run,
			lines,
			(l) => l.account ?? "",
			(l) => nameOf(names, l.account ?? ""),
		),
		notes: [],
	}
}

/** What each `withdraw` entry drew; an entry is told apart from another of its Account by its words. */
export function drawnFigure(
	run: ProjectionRun,
	list: readonly Entry[],
	names: AccountNames,
): Figure {
	const nameBy = (line: Line): string => {
		const at = line.entry ?? list.findIndex((one) => entryAccount(one) === line.account)
		const words = at < 0 ? [] : entryWords(list, at, names)
		return words.length > 0 ? plainText(words, formatMoney) : nameOf(names, line.account ?? "")
	}
	const key = (line: Line) => `${line.entry ?? ""}:${line.account ?? ""}`
	return { series: seriesOf(run, linesOf(run, "drawn"), key, nameBy), notes: [] }
}

/** What each saving into an Account in the `contribute` list took, a series for each Flow. */
export function savedFigure(
	run: ProjectionRun,
	listed: readonly string[],
	names: AccountNames,
): Figure {
	const lines = linesOf(run, "contribution").filter((l) => listed.includes(l.account ?? ""))
	const nameBy = (l: Line) => `${l.id ?? ""} into ${nameOf(names, l.account ?? "")}`
	return { series: seriesOf(run, lines, (l) => `${l.id}:${l.account}`, nameBy), notes: [] }
}

/** What each transfer moved, and a note for each year part of its plan did not move. */
export function movedFigure(run: ProjectionRun): Figure {
	const rows = run.tables.flatMap((table) => (table.name === "transfers" ? table.rows : []))
	const notes = rows
		.filter((row) => isAboveZero(row.unmoved))
		.map((row) => `${row.to.slice(0, 4)}: ${formatMoney(row.unmoved)} of ${row.flow} did not move.`)
	return {
		series: seriesOf(
			run,
			rows,
			(row) => row.flow,
			(row) => row.flow,
		),
		notes,
	}
}
