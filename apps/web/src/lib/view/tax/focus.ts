import { shares, toChartNumber } from "../../chart"
import type { ProjectionAllowances, ProjectionRun } from "../../contract"
import { formatCompact, isAboveZero } from "../../format"
import { dropLeadingMinus } from "../../format/direction"
import { taxBody } from "./body"
import type { BracketBar } from "./bracket-bars"
import type { CurrentYear } from "./current-year"
import { isRefund } from "./tax-rows"

/** What the "Save tax" action opens: the Tax allowances page, with the address's query string kept. */
const SAVE_TAX = { label: "Save tax", href: "/optimize/allowances/" }

/** One bracket's slice of the income bar; the last one is the bracket the last baht falls in. */
export interface TaxSegment {
	readonly share: number
	readonly top: boolean
}

/** The Tax page's focus point: the first tax year as one bar of income split into its brackets. */
export interface TaxFocus {
	/** The question, the answer and the saving, for the sr-only heading. */
	readonly label: string
	readonly owed: string
	readonly refund: boolean
	readonly currency: string
	/** The settlement date, as a small tick under the bar. */
	readonly due: string
	readonly segments: readonly TaxSegment[]
	/** At most one primary action, and only when the allowances read states a saving above zero. */
	readonly action: { readonly label: string; readonly href: string } | undefined
}

/** The saving the allowances read states for the tax year the As-of falls in, or null when it states none. */
function currentSaving(data: ProjectionAllowances | null): string | null {
	if (data === null) return null
	const year = data.taxYears.find((one) => one.from <= data.asOf && data.asOf <= one.to) ?? null
	return year?.saving ?? null
}

/** The tax year's own answer in words: the year's tax, or a refund, and the date it settles. */
function answerWords(current: CurrentYear, currency: string): string {
	const amount = formatCompact(dropLeadingMinus(current.owed))
	if (isRefund(current.owed)) {
		return `How much tax for ${current.period}? A refund of ${amount} ${currency}, due ${current.settles}.`
	}
	return `How much tax for ${current.period}? ${amount} ${currency} due ${current.settles}.`
}

/** The year's figure, or the note that Hide amounts hides it; the date stays either way. */
function headWords(current: CurrentYear, currency: string, hidden: boolean): string {
	if (hidden)
		return `How much tax for ${current.period}? The amount is hidden. Due ${current.settles}.`
	return answerWords(current, currency)
}

/** "You could still save 91.7k THB.", or the note that the saving is hidden too. */
function savingWords(saving: string, currency: string, hidden: boolean): string {
	if (hidden) return " You could still save an amount that is hidden."
	return ` You could still save ${formatCompact(saving)} ${currency}.`
}

/** Each reached bracket's share of the income bar, the last one marked as the top rate. */
function segmentShares(bars: readonly BracketBar[]): readonly TaxSegment[] {
	const weights = shares(bars.map((bar) => toChartNumber(bar.income)))
	return weights.map((share, index) => ({ share, top: index === weights.length - 1 }))
}

/**
 * The focus point of one projection's tax, from the same body the page draws its brackets from. Null for a
 * plan with no tax rules, or one whose current year states no brackets to split. Every figure is the CLI's,
 * and the bar's widths are its bracket incomes placed for drawing only (web ADR 0002).
 */
export function taxFocusView(
	run: ProjectionRun,
	allowances: ProjectionAllowances | null,
	hidden: boolean,
): TaxFocus | null {
	const body = taxBody(run)
	if (body.kind !== "levies" || body.current === null) return null
	const current = body.current
	const bars = current.bars ?? []
	if (bars.length === 0) return null
	const saving = currentSaving(allowances)
	const canSave = saving !== null && isAboveZero(saving)
	return {
		label: `${headWords(current, run.currency, hidden)}${saving !== null && canSave ? savingWords(saving, run.currency, hidden) : ""}`,
		owed: current.owed,
		refund: isRefund(current.owed),
		currency: run.currency,
		due: current.settles,
		segments: segmentShares(bars),
		action: canSave ? SAVE_TAX : undefined,
	}
}
