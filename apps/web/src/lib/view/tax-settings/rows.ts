/** The rows the page shows for a stored tax profile: what was stated, and "None" for the rest. Pure; no arithmetic. */
import type { ScenarioShow, TaxProfile } from "../../contract"
import type { PersonName } from "../item-names"
import { AMOUNT_FIELDS, COUNT_FIELDS, filingLabel } from "./fields"

/** A money amount as a page shows it: the digits Hide amounts masks, and the words after them. */
export interface ShownAmount {
	readonly digits: string
	readonly after: string
}

/** One row: the item and what the profile states for it. */
export interface ProfileRow {
	/** The profile key of the item, so a group takes its own rows. */
	readonly key: string
	readonly label: string
	readonly value: string
	/** The amount's digits and the words after them, for the hide-amounts mask; absent for a count or a word. */
	readonly amount?: ShownAmount | undefined
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

/** What the profile states at a key, or undefined when it states nothing. */
function statedIn(profile: TaxProfile, key: string): number | undefined {
	return (profile as Record<string, unknown>)[key] as number | undefined
}

/**
 * An amount in baht, said to be kept and unclaimed when no Return of the plan claims the shared interest: the row's
 * text, and the digits and words after them so the hide-amounts mask keeps the currency and the words.
 */
function amountValue(
	key: string,
	amount: number | undefined,
	sharedClaimed: boolean,
): { value: string; amount?: ShownAmount } {
	if (amount === undefined) return { value: "None" }
	const digits = groupDigits(amount)
	const after =
		key === "sharedMortgageInterest" && !sharedClaimed
			? " THB (kept, not claimed by this Return)"
			: " THB"
	return { value: `${digits}${after}`, amount: { digits, after } }
}

/** The amount rows: the shared row only where the separate filing shows one or the profile stores it. */
function amountRows(
	profile: TaxProfile,
	claimant: PersonName | null,
	sharedClaimed: boolean,
): ProfileRow[] {
	return AMOUNT_FIELDS.flatMap(({ key, label }) => {
		const amount = statedIn(profile, key)
		if (key === "sharedMortgageInterest" && profile.filingStatus !== "married_separate") {
			if (amount === undefined) return []
		}
		return [
			{
				key,
				label: labelOf(key, label, claimant),
				...amountValue(key, amount, sharedClaimed),
			},
		]
	})
}

/**
 * The filing status, then each count and amount; an item the profile does not state, or states as zero, reads "None".
 * `claimant` names the person whose claims the flat keys are, when that is not the household's holder, and
 * `sharedClaimed` says whether a Return of the plan claims the stored shared home-loan interest.
 */
export function profileRows(
	profile: TaxProfile,
	claimant: PersonName | null = null,
	sharedClaimed = profile.filingStatus === "married_separate",
): ProfileRow[] {
	return [
		{ key: "filingStatus", label: "Filing status", value: filingLabel(profile.filingStatus) },
		...COUNT_FIELDS.map(({ key, label }) => {
			const counted = statedIn(profile, key)
			return {
				key,
				label: labelOf(key, label, claimant),
				value: counted === undefined || counted === 0 ? "None" : String(counted),
			}
		}),
		...amountRows(profile, claimant, sharedClaimed),
	]
}

/** Whether the plan holds a tax Levy. A Snapshot saved before profiles were kept states no `taxed`; the plan's own Levies say it. */
export function isTaxed(show: ScenarioShow["scenario"]): boolean {
	const { taxed, document: plan } = show
	return taxed ?? (plan.levies?.length ?? 0) > 0
}
