import { shares, toChartNumber } from "../../chart"
import type { ProjectionAllowances, ProjectionRun } from "../../contract"
import { isAboveZero } from "../../format"
import { taxBodyOf } from "./body"
import type { BracketBar } from "./bracket-bars"
import { headWords, savingWords } from "./focus-words"
import { focusYear } from "./focus-year"
import { isRefund } from "./tax-rows"

/** What the "Save tax" action opens: the Tax allowances page, with the address's query string kept. */
const SAVE_TAX = { label: "Save tax", href: "/optimize/allowances/" }

/** One bracket's slice of the income bar; the last one is the bracket the last baht falls in. */
export interface TaxSegment {
	readonly share: number
	readonly top: boolean
}

/** The Tax page's focus point: the Return on screen's tax year as one bar of income split into its brackets. */
export interface TaxFocus {
	/** The question, the answer and the saving, for the sr-only heading. */
	readonly label: string
	readonly owed: string
	readonly refund: boolean
	readonly currency: string
	/** The settlement date, as a small tick under the bar. */
	readonly due: string
	/** The saving above zero the allowances read states for this Return, on the "Save" mark; null when none. */
	readonly saving: string | null
	readonly segments: readonly TaxSegment[]
	/** True when no bracket put income on the bar, so it draws a thin baseline instead of nothing. */
	readonly emptyBar: boolean
	/** At most one primary action, and only when the allowances read states a saving above zero. */
	readonly action: { readonly label: string; readonly href: string } | undefined
}

/** The saving the allowances read states for the Return on screen and the tax year the As-of falls in. */
function currentSaving(data: ProjectionAllowances | null, filer: string | null): string | null {
	if (data === null) return null
	const year = data.taxYears.find(
		(one) =>
			(filer === null ? one.filer === undefined : one.filer === filer) &&
			one.from <= data.asOf &&
			data.asOf <= one.to,
	)
	return year?.saving ?? null
}

/** Each reached bracket's share of the income bar, the last one marked as the top rate. */
function segmentShares(bars: readonly BracketBar[]): readonly TaxSegment[] {
	const weights = shares(bars.map((bar) => toChartNumber(bar.income)))
	return weights.map((share, index) => ({ share, top: index === weights.length - 1 }))
}

/**
 * The focus point of one projection's tax for the Return on screen (`filer`, null for a plan's one Return),
 * from the same body the page draws its brackets from. Null for a plan with no tax rules or no tax year. Every
 * figure is the CLI's, and the bar's widths are its bracket incomes placed for drawing only (web ADR 0002).
 */
export function taxFocusView(
	run: ProjectionRun,
	allowances: ProjectionAllowances | null,
	hidden: boolean,
	filer: string | null = null,
): TaxFocus | null {
	const years = filer === null ? run.taxYears : run.taxYears.filter((one) => one.filer === filer)
	const current = focusYear(taxBodyOf(years, run.tax, run.asOf), years, run.asOf)
	if (current === null) return null
	const saving = currentSaving(allowances, filer)
	const canSave = saving !== null && isAboveZero(saving)
	const stated = saving !== null && canSave ? saving : null
	const segments = segmentShares(current.bars)
	return {
		label: `${headWords(current.period, current.owed, current.settles, run.currency, hidden)}${
			stated === null ? "" : savingWords(stated, run.currency, hidden)
		}`,
		owed: current.owed,
		refund: isRefund(current.owed),
		currency: run.currency,
		due: current.settles,
		saving: stated,
		segments,
		emptyBar: segments.every((segment) => segment.share === 0),
		action: canSave ? SAVE_TAX : undefined,
	}
}
