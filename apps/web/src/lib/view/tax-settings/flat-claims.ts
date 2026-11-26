/**
 * Whose claims a profile's flat keys are, and why the page waits after a holder swap ([cli ADR 0075](../../../../cli/docs/adr/0075-a-two-earner-plan-states-its-filing-choice-and-scenario-tax-writes-one-levy-per-return.md),
 * [web ADR 0016](../../../../docs/adr/0016-the-tax-profile-page-changes-one-item-through-scenario-tax-merge.md)). Pure.
 */
import type { HouseholdDocument, TaxProfile } from "../../contract"
import type { PersonName, PersonNames } from "../item-names"

/** The words for an id the household no longer names: never the id, and never a person it does not state. */
export const EARLIER_HOLDER: PersonName = {
	label: "The earlier holder",
	subject: "the earlier holder",
}

/** The column words for an id the household no longer names that is not the recorded holder: never the id. */
export const ANOTHER_PERSON_LABEL = "Another person"

/** The person the flat keys are recorded under: the household's words, and whether that id has left the household. */
export interface FlatClaimant extends PersonName {
	readonly departed: boolean
}

/**
 * The person whose claims the profile's flat keys are, when a separate filing's holder swap left them recorded for the
 * other person: the cards then name them instead of saying "you". Null for a filing that keeps one Return, whose flat
 * keys are that Return's own, and with no household holder to compare the record against. An id the household no longer
 * names is called the earlier holder, never by its id.
 */
export function flatClaimant(
	profile: TaxProfile,
	household: HouseholdDocument | null,
	people: PersonNames,
): FlatClaimant | null {
	if (profile.filingStatus !== "married_separate") return null
	const recorded = profile.claimsHolder
	const holder = household?.people.find((person) => person.role === "holder")?.id
	if (recorded === undefined || holder === undefined || recorded === holder) return null
	const name = people.get(recorded)
	return name === undefined ? { ...EARLIER_HOLDER, departed: true } : { ...name, departed: false }
}

/** The lock's words around its command, so a component sets the command in code and the server states it plain. */
export interface FlatClaimNoteParts {
	readonly before: string
	readonly command: string
	readonly after: string
}

/**
 * Why the page waits before it changes the flat claims of a swapped holder, in the person's own words. `--from-stored`
 * moves the flat keys to the recorded person's Return and lets the page edit again; those claims stay unclaimed when
 * that person has left the household, until they are stated for a person who has a Return.
 */
export function flatClaimParts(claimant: FlatClaimant, plan: string): FlatClaimNoteParts {
	const command = `traj scenario tax ${plan} --from-stored`
	if (claimant.departed) {
		return {
			before: `These claims are still recorded under ${claimant.subject}, who is no longer in the household. They stay unclaimed until they are stated for a person who has a Return. Run `,
			command,
			after: " before editing them here.",
		}
	}
	return {
		before: `These claims are still recorded under ${claimant.subject}. Run `,
		command,
		after: " to record them under each person, then edit them here.",
	}
}

/** The lock sentence, with the command in backticks for a plain-text reader. */
export function flatClaimNote(claimant: FlatClaimant, plan: string): string {
	const { before, command, after } = flatClaimParts(claimant, plan)
	return `${before}\`${command}\`${after}`
}

/** The same sentence as a server refusal, with the command plain: the form shows the message as text, not markup. */
export function flatClaimRefusal(claimant: FlatClaimant, plan: string): string {
	const { before, command, after } = flatClaimParts(claimant, plan)
	return `${before}${command}${after}`
}
