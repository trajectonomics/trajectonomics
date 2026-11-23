import type {
	AllowanceFlow,
	AllowanceRow,
	AllowanceYear,
	ProjectionAllowances,
} from "../../contract"
import { allowanceName, SSF_LABEL } from "../../contract/allowance-labels"
import { formatDate } from "../../format"
import { type AssumptionLine, assumptionLines } from "../tax/assumptions"
import { SSF_WORDS, STOP_WORDS } from "./words"

/** One allowance in one tax year, as the page reads it. An SSF line has words and no figure (tax ADR 0007). */
export interface LineView {
	readonly key: string
	readonly name: string
	readonly ssf: boolean
	readonly planned: string
	readonly extra: string
	readonly saving: string
	readonly why: string
	readonly flow: AllowanceFlow | undefined
	readonly hint: string | undefined
}

/** One tax year: what it owes now and with every suggestion, the saving, and a line per allowance. */
export interface YearView {
	readonly key: string
	readonly levy: string
	readonly period: string
	readonly settles: string
	readonly dueBefore: string
	readonly dueAfter: string
	readonly saving: string
	readonly lines: readonly LineView[]
	/** The Flows that apply the year's suggestions. */
	readonly flows: readonly AllowanceFlow[]
	/** True when there is a Flow to add and each has an Account to go into. */
	readonly addable: boolean
	readonly hints: readonly string[]
}

/** The whole page's reading of one `projection allowances` result. */
export interface AllowancesView {
	readonly currency: string
	readonly step: string
	readonly current: YearView | null
	readonly later: readonly YearView[]
	readonly assumptions: readonly AssumptionLine[]
	readonly notes: readonly string[]
}

function lineOf(row: AllowanceRow): LineView {
	const ssf = row.label === SSF_LABEL
	return {
		key: `${row.levy}:${row.from}:${row.label}`,
		name: allowanceName(row.label),
		ssf,
		planned: row.planned,
		extra: row.extra,
		saving: row.saving,
		why: ssf ? SSF_WORDS : STOP_WORDS[row.stoppedBy],
		flow: ssf ? undefined : row.flow,
		hint: ssf ? undefined : row.hint,
	}
}

function yearOf(year: AllowanceYear, rows: readonly AllowanceRow[]): YearView {
	const lines = rows.filter((row) => row.levy === year.levy && row.from === year.from).map(lineOf)
	const flows = lines.flatMap((line) => (line.flow === undefined ? [] : [line.flow]))
	return {
		key: `${year.levy}:${year.from}`,
		levy: year.levy,
		period: `${formatDate(year.from)} to ${formatDate(year.to)}`,
		settles: formatDate(year.settlementDate),
		dueBefore: year.dueBefore,
		dueAfter: year.dueAfter,
		saving: year.saving,
		lines,
		flows,
		addable: flows.length > 0 && flows.every((flow) => flow.target !== undefined),
		hints: lines.flatMap((line) => (line.hint === undefined ? [] : [line.hint])),
	}
}

/**
 * The page's view of a read: the tax year the As-of falls in first, then the later years, each in the CLI's
 * order. Every figure is the CLI's own string; whether a year is the current one is a date comparison only.
 */
export function allowancesView(data: ProjectionAllowances): AllowancesView {
	const years = data.taxYears.map((year) => yearOf(year, data.allowances))
	const currentAt = data.taxYears.findIndex((y) => y.from <= data.asOf && data.asOf <= y.to)
	return {
		currency: data.currency,
		step: data.step,
		current: years[currentAt] ?? null,
		later: years.filter((_, index) => index !== currentAt),
		assumptions: assumptionLines(data.taxYears),
		notes: data.notes,
	}
}
