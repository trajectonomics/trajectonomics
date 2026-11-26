/**
 * The Returns a `projection allowances` read states: one per Filer of a separate filing, and one joint Return over
 * Filers whose rows still name each spouse. A plan without Filers names none, and the page reads it as it always has.
 * Pure: the years are grouped in the CLI's order and no figure changes.
 */
import type {
	AllowanceRow,
	ProjectionAllowances,
	ProjectionRun,
	Read,
	ScenarioDocument,
} from "../../contract"
import { filerOfLabel } from "../../edit/tax-labels"
import { filersOf } from "../../snapshot/allowance-filers"
import { isFilerPlan } from "../../snapshot/allowance-params"
import type { YearView } from "./years"

/** One Return: the Filer whose Return it is, or null for one Return over no Filer, and its tax years. */
export interface ReturnView {
	/** The Filer, or the empty string for one Return over no Filer. */
	readonly key: string
	readonly filer: string | null
	readonly current: YearView | null
	readonly later: readonly YearView[]
}

/** The Filer a row names: the CLI's own field, else the suffix its label carries; null for neither. */
export function filerOfRow(row: AllowanceRow): string | null {
	if (row.filer !== undefined) return row.filer
	return filerOfLabel(row.label)
}

/** What a Filer plan with no Return to read says: its labels name a Filer, but no Levy of it tallies one. */
const NO_FILER_LEVY =
	"This plan's labels name a Filer, but no Levy of it tallies a Filer's label, so there is no Return to read. Run `traj scenario tax <name> --from-stored` to write each label with its Filer suffix."

/**
 * Why a Filer plan has no allowance read, or null when it has one: the read names no Filer, so `traj` would
 * refuse the suffixed labels the page would have to send. A plan without Filers says nothing.
 */
export function skippedReadReason(
	document: ScenarioDocument | null,
	projection: Read<ProjectionRun> | undefined,
): string | null {
	if (document === null || !isFilerPlan(document)) return null
	const data = projection?.ok === true ? projection.data : undefined
	return filersOf(document, data).length > 0 ? null : NO_FILER_LEVY
}

/** Whether the read names any Filer, so the page groups its Returns; a plan without Filers groups nothing. */
export function isFilerRead(data: ProjectionAllowances): boolean {
	return (
		data.taxYears.some((year) => year.filer !== undefined) ||
		data.allowances.some((row) => filerOfRow(row) !== null)
	)
}

/**
 * One Return per Filer the read states, in the CLI's order, each with the tax year the As-of falls in first.
 * Every Return takes its own current year: the As-of is the same date for each of them.
 */
export function returnsView(years: readonly YearView[], asOf: string): readonly ReturnView[] {
	const grouped = new Map<string | null, YearView[]>()
	for (const year of years) {
		const held = grouped.get(year.filer)
		if (held === undefined) grouped.set(year.filer, [year])
		else held.push(year)
	}
	return [...grouped].map(([filer, held]) => {
		const mine = held.find((year) => year.from <= asOf && asOf <= year.to) ?? null
		return {
			key: filer ?? "",
			filer,
			current: mine,
			later: held.filter((year) => year !== mine),
		}
	})
}
