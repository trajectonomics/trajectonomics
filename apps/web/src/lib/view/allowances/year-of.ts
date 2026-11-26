import type { AllowanceRow, AllowanceYear } from "../../contract"
import { allowanceName, SSF_LABEL } from "../../contract/allowance-labels"
import { bareLabelOf } from "../../edit/tax-labels"
import { formatDate } from "../../format"
import { filerOfRow } from "./returns"
import { SSF_WORDS, STOP_WORDS } from "./words"
import type { LineView, YearView } from "./years"

function lineOf(row: AllowanceRow): LineView {
	// A Filer plan's label carries its Filer's suffix; the name a person reads is the bare label's.
	const label = bareLabelOf(row.label)
	const ssf = label === SSF_LABEL
	return {
		key: `${row.levy}:${row.from}:${row.label}`,
		name: allowanceName(label),
		ssf,
		filer: filerOfRow(row),
		planned: row.planned,
		extra: row.extra,
		saving: row.saving,
		why: ssf ? SSF_WORDS : STOP_WORDS[row.stoppedBy],
		flow: ssf ? undefined : row.flow,
		hint: ssf ? undefined : row.hint,
	}
}

/** The one Filer a year's lines name; null when they name none or a joint Return over both. */
function filerOfLines(lines: readonly LineView[]): string | null {
	const filers = new Set(lines.flatMap((line) => (line.filer === null ? [] : [line.filer])))
	return filers.size === 1 ? (filers.values().next().value ?? null) : null
}

/** One tax year: the CLI's own figures and the Flows that apply its suggestions, in the CLI's order. */
export function yearOf(year: AllowanceYear, rows: readonly AllowanceRow[]): YearView {
	const lines = rows.filter((row) => row.levy === year.levy && row.from === year.from).map(lineOf)
	const flows = lines.flatMap((line) => (line.flow === undefined ? [] : [line.flow]))
	const placeable = flows.filter((flow) => flow.target !== undefined)
	const unplaced = lines.flatMap((line) =>
		line.flow !== undefined && line.flow.target === undefined
			? [{ name: line.name, hint: line.hint ?? "" }]
			: [],
	)
	return {
		key: `${year.levy}:${year.from}`,
		levy: year.levy,
		filer: year.filer ?? filerOfLines(lines),
		from: year.from,
		to: year.to,
		period: `${formatDate(year.from)} to ${formatDate(year.to)}`,
		settles: formatDate(year.settlementDate),
		dueBefore: year.dueBefore,
		dueAfter: year.dueAfter,
		saving: year.saving,
		lines,
		flows,
		placeable,
		unplaced,
		addable: placeable.length > 0,
		hints: lines.flatMap((line) => (line.hint === undefined ? [] : [line.hint])),
	}
}
