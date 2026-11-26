/** The rows the page shows for a stored tax profile: what was stated, and "None" for the rest. Pure; no arithmetic. */
import type { ScenarioShow, TaxProfile } from "../../contract"
import type { PersonName } from "../item-names"
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

/** The rows whose words say "you": a separate filing's flat keys may be the other person's claims after a holder swap. */
const YOURS: Readonly<Record<string, (who: PersonName) => string>> = {
	parents: (who) => `Parents ${who.subject} supports`,
	disabledCare: (who) => `Relatives with a disability ${who.subject} cares for`,
	healthInsurance: (who) => `${who.label}'s health insurance premiums`,
	parentHealthInsurance: (who) => `Health insurance premiums for ${who.subject}'s parents`,
}

/** What an item is called: its own words, or the claimant's when the flat keys are the other person's claims. */
function labelOf(key: string, label: string, claimant: PersonName | null): string {
	return claimant === null ? label : (YOURS[key]?.(claimant) ?? label)
}

/**
 * The filing status, then each count and amount; an item the profile does not state, or states as zero, reads "None".
 * `claimant` names the person whose claims the flat keys are, when that is not the household's holder.
 */
export function profileRows(profile: TaxProfile, claimant: PersonName | null = null): ProfileRow[] {
	const stated = (key: string): number | undefined =>
		(profile as Record<string, unknown>)[key] as number | undefined
	return [
		{ key: "filingStatus", label: "Filing status", value: filingLabel(profile.filingStatus) },
		...COUNT_FIELDS.map(({ key, label }) => {
			const counted = stated(key)
			return {
				key,
				label: labelOf(key, label, claimant),
				value: counted === undefined || counted === 0 ? "None" : String(counted),
			}
		}),
		...AMOUNT_FIELDS.map(({ key, label }) => {
			const amount = stated(key)
			return {
				key,
				label: labelOf(key, label, claimant),
				value: amount === undefined ? "None" : `${groupDigits(amount)} THB`,
			}
		}),
	]
}

/** Whether the plan holds a tax Levy. A Snapshot saved before profiles were kept states no `taxed`; the plan's own Levies say it. */
export function isTaxed(show: ScenarioShow["scenario"]): boolean {
	const { taxed, document: plan } = show
	return taxed ?? (plan.levies?.length ?? 0) > 0
}
