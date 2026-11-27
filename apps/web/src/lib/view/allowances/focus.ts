import { shares, toChartNumber } from "../../chart"
import type { ProjectionAllowances } from "../../contract"
import { formatCompact } from "../../format"
import { allowancesView } from "./years"

/** One allowance's bar: the part this plan already takes, and the part it could still take. */
export interface AllowanceBar {
	/** Both parts are shares of the allowance's own room, from 0 to 1. */
	readonly taken: number
	readonly left: number
}

/** The Tax allowances page's focus point: each allowance's room, and the tax every suggestion together saves. */
export interface AllowancesFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	readonly saving: string
	readonly currency: string
	readonly bars: readonly AllowanceBar[]
}

/**
 * The focus point of the tax year the As-of falls in. Null when the read states no such year or no allowance
 * with room, which is the page's own empty state rather than an answer. The bars' shares are the CLI's
 * amounts placed for drawing only (web ADR 0002).
 */
export function allowancesFocusView(
	data: ProjectionAllowances,
	hidden: boolean,
): AllowancesFocus | null {
	const view = allowancesView(data)
	const year = view.current
	if (year === null) return null
	const bars = year.lines
		.filter((line) => !line.ssf)
		.map((line) => {
			const [taken = 0, left = 0] = shares([toChartNumber(line.planned), toChartNumber(line.extra)])
			return { taken, left }
		})
	if (bars.length === 0) return null
	const label = hidden
		? `How much tax could you still save? The amount is hidden. By taking more of your allowances in ${year.period}.`
		: `How much tax could you still save? ${formatCompact(year.saving)} ${view.currency} by taking more of your allowances in ${year.period}.`
	return { label, saving: year.saving, currency: view.currency, bars }
}
