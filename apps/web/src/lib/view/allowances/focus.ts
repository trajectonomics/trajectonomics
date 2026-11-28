import type { ProjectionAllowances } from "../../contract"
import { formatCompact } from "../../format"
import { NO_PEOPLE, type PersonNames } from "../item-names"
import { JOINT_RETURN, returnLabel } from "../tax-settings/return-name"
import { type AllowanceGroup, barsOf, largestRoomOf } from "./focus-bars"
import { allowancesView } from "./years"

/** The Tax allowances page's focus point: each Return's room, and the tax its suggestions together save. */
export interface AllowancesFocus {
	/** The question and every Return's answer, for the sr-only heading. */
	readonly label: string
	readonly currency: string
	/** The tax year, as a small tick under the bars: "2026". */
	readonly period: string
	readonly groups: readonly AllowanceGroup[]
}

/** The words a group's Filer goes by, for the heading: the household's name, a plain title, or the id in code. */
function nameOf(group: AllowanceGroup): string {
	if (typeof group.name === "string") return group.name
	return group.name?.text ?? ""
}

/** The heading: one Return's answer, or every Return's own, never their sum. */
function labelOf(
	groups: readonly AllowanceGroup[],
	period: string,
	currency: string,
	hidden: boolean,
): string {
	const head = "How much tax could you still save?"
	const tail = `By taking more of your allowances in ${period}.`
	const first = groups[0]
	if (groups.length === 1 || first === undefined) {
		return hidden
			? `${head} The amount is hidden. ${tail}`
			: `${head} ${formatCompact(first?.saving ?? "0.00")} ${currency}. ${tail}`
	}
	const each = groups.map((group) =>
		hidden
			? `${nameOf(group)}: the amount is hidden.`
			: `${nameOf(group)}: ${formatCompact(group.saving)} ${currency}.`,
	)
	return `${head} ${each.join(" ")} ${tail}`
}

/**
 * The focus point of the tax year the As-of falls in, one group of bars per Return. Null when the read states
 * no such year or no allowance with room, which is the page's own empty state rather than an answer. The bars'
 * widths are the CLI's amounts placed for drawing only (web ADR 0002).
 */
export function allowancesFocusView(
	data: ProjectionAllowances,
	hidden: boolean,
	people: PersonNames = NO_PEOPLE,
	claimsHolder: string | null = null,
): AllowancesFocus | null {
	const view = allowancesView(data)
	const several = view.returns.length > 1
	const filers = view.returns.flatMap((one) => (one.filer === null ? [] : [one.filer]))
	const currents =
		view.returns.length > 0
			? view.returns.flatMap((one) =>
					one.current === null ? [] : [{ key: one.key, filer: one.filer, year: one.current }],
				)
			: view.current === null
				? []
				: [{ key: view.current.key, filer: null, year: view.current }]
	if (currents.length === 0) return null
	const largest = largestRoomOf(currents.map((one) => one.year))
	if (largest === 0) return null
	const groups = currents.map((one) => ({
		key: one.key,
		name:
			several && one.filer !== null
				? returnLabel(one.filer, people, claimsHolder, filers)
				: several
					? JOINT_RETURN
					: null,
		saving: one.year.saving,
		bars: barsOf(one.year, largest),
	}))
	const period = currents[0]?.year.period ?? ""
	return {
		label: labelOf(groups, period, view.currency, hidden),
		currency: view.currency,
		period,
		groups,
	}
}
