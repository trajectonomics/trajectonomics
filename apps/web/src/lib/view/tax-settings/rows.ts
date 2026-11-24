/** The rows the page shows for a stored tax profile: what was stated, and "None" for the rest. Pure; no arithmetic. */
import type { ScenarioShow, TaxProfile } from "../../contract"
import { AMOUNT_FIELDS, COUNT_FIELDS, filingLabel } from "./fields"

/** One row: the item and what the profile states for it. */
export interface ProfileRow {
	/** The profile key of the item, so a group takes its own rows. */
	readonly key: string
	readonly label: string
	readonly value: string
}

/** Digits grouped in threes, so 1250000.5 reads 1,250,000.5. Only the text changes. */
export function groupDigits(value: number): string {
	const [whole = "", part] = String(value).split(".")
	const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
	return part === undefined ? grouped : `${grouped}.${part}`
}

/** The filing status, then each count and amount; an item the profile does not state, or states as zero, reads "None". */
export function profileRows(profile: TaxProfile): ProfileRow[] {
	const stated = (key: string): number | undefined =>
		(profile as Record<string, unknown>)[key] as number | undefined
	return [
		{ key: "filingStatus", label: "Filing status", value: filingLabel(profile.filingStatus) },
		...COUNT_FIELDS.map(({ key, label }) => {
			const counted = stated(key)
			return {
				key,
				label,
				value: counted === undefined || counted === 0 ? "None" : String(counted),
			}
		}),
		...AMOUNT_FIELDS.map(({ key, label }) => {
			const amount = stated(key)
			return { key, label, value: amount === undefined ? "None" : `${groupDigits(amount)} THB` }
		}),
	]
}

/** Whether the plan holds a tax Levy. A Snapshot saved before profiles were kept states no `taxed`; the plan's own Levies say it. */
export function isTaxed(show: ScenarioShow["scenario"]): boolean {
	const { taxed, document: plan } = show
	return taxed ?? (plan.levies?.length ?? 0) > 0
}
