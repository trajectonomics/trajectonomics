/**
 * The page's reading of one `projection allowances` result: the tax year the As-of falls in first, then the later
 * years, each in the CLI's order. Every figure is the CLI's own string; whether a year is the current one is a date
 * comparison only. A read that names Filers is grouped into one section per Return (`returns.ts`). Pure.
 */
import type { AllowanceFlow, ProjectionAllowances } from "../../contract"
import { type AssumptionLine, assumptionLines } from "../tax/assumptions"
import { isFilerRead, type ReturnView, returnsView } from "./returns"
import { ESTIMATE_NOTE } from "./words"
import { yearOf } from "./year-of"

/** One allowance in one tax year, as the page reads it. An SSF line has words and no figure (tax ADR 0007). */
export interface LineView {
	readonly key: string
	readonly name: string
	readonly ssf: boolean
	/** The Filer whose allowance this is, for a Return over Filers; null when the plan keeps one Return. */
	readonly filer: string | null
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
	/** The Filer whose Return this year is; null for one Return over no Filer, or a joint Return over both. */
	readonly filer: string | null
	readonly from: string
	readonly to: string
	readonly period: string
	readonly settles: string
	readonly dueBefore: string
	readonly dueAfter: string
	readonly saving: string
	readonly lines: readonly LineView[]
	/** The Flows that apply the year's suggestions. */
	readonly flows: readonly AllowanceFlow[]
	/** The Flows with an Account to go into: the ones Try and Add offer. */
	readonly placeable: readonly AllowanceFlow[]
	/** The suggestions with no Account, each with the CLI's hint, so the year says which to add. */
	readonly unplaced: readonly { readonly name: string; readonly hint: string }[]
	/** True when at least one Flow has an Account to go into. */
	readonly addable: boolean
	readonly hints: readonly string[]
}

/** The whole page's reading of one `projection allowances` result. */
export interface AllowancesView {
	readonly currency: string
	readonly step: string
	readonly current: YearView | null
	readonly later: readonly YearView[]
	/** One section per Return, when the read names Filers; empty for a plan without them. */
	readonly returns: readonly ReturnView[]
	readonly assumptions: readonly AssumptionLine[]
	readonly notes: readonly string[]
}

/** The page's view of a read, with each tax year as a card and each Return as a section when it names Filers. */
export function allowancesView(data: ProjectionAllowances): AllowancesView {
	const years = data.taxYears.map((year) => yearOf(year, data.allowances))
	const currentAt = data.taxYears.findIndex((y) => y.from <= data.asOf && data.asOf <= y.to)
	const current = years[currentAt] ?? null
	return {
		currency: data.currency,
		step: data.step,
		current,
		later: years.filter((_, index) => index !== currentAt),
		returns: isFilerRead(data) ? returnsView(years, data.asOf) : [],
		assumptions: assumptionLines(data.taxYears),
		notes: data.notes.some((note) => /tax advice/i.test(note))
			? data.notes
			: [...data.notes, ESTIMATE_NOTE],
	}
}
