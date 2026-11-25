import { thFilerLabel } from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../../errors"
import type { ScenarioDocument } from "../document"
import { type Household, type Person, SHARED } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
import { relabelled, taxSlots } from "./filer-labels"
import type { ThFilingStatus } from "./flags"

/*
 * Who files a joint Return (cli ADR-0075). A plan whose household has a partner and Owners writes
 * one Levy over two Filers, each Flow and Account tallied under its Owner's Filer label. A plan
 * without both writes the bare labels it always wrote.
 */

/** The Filers of a joint Return, and which of them owns each taxed item. */
export type FilerScope = {
	/** The Filer ids, the holder first, only the people who have income. */
	filers: string[]
	/** The Owner's Filer id of each taxed item, `shared` for both. */
	ownerOf: ReadonlyMap<string, string>
}

/** The household's two people who can file, the holder first; null without a partner. */
function couple(household: Household): [Person, Person] | null {
	const holder = household.people.find((person) => person.role === "holder")
	const partner = household.people.find((person) => person.role === "partner")
	return holder === undefined || partner === undefined ? null : [holder, partner]
}

/** The refusal listing each taxed item that has no Owner, the way an unlabelled income Flow is refused. */
function ownerless(items: readonly string[]): AppError {
	return fail("invalid_input", {
		path: "document",
		message: `With --filing-status married_joint and Owners in the household, every taxed Flow and Account needs an Owner; ${
			items.length === 1 ? "one item has" : `${items.length} items have`
		} none, so tax could not say whose income it is.`,
		hint: 'Add each item to "owners" in the household, as {"path": "flows.<id>", "person": "<person id>"} or "shared", then run "traj scenario household" again.',
		details: { items },
	})
}

/** The refusal for a person whose id cannot be a Filer label's suffix. */
function unfit(person: Person, index: number): AppError {
	return fail("invalid_input", {
		path: "filingStatus",
		message: `--filing-status married_joint needs each Filer's id to be 1 to 32 lowercase letters, digits or hyphens, and people.${index}.id "${person.id}" is not.`,
		hint: 'Rename the person with "traj scenario household" (an id such as "me" or "partner"), then write the tax again.',
		details: { field: `people.${index}.id`, person: person.id },
	})
}

/** The first Filer id tax refuses as a label's suffix, or null when every one fits. */
function unfitFiler(household: Household, filers: readonly string[]): AppError | null {
	for (const id of filers) {
		try {
			thFilerLabel("x", id)
		} catch {
			const index = household.people.findIndex((person) => person.id === id)
			return unfit(household.people[index] as Person, index)
		}
	}
	return null
}

/**
 * The Filers of a joint Return, or `null` when the plan keeps bare labels: another filing status,
 * a household with no partner or no Owners, or no taxed item at all. A Filer has income when a
 * taxed item is theirs or `shared`; a taxed item with no Owner is refused.
 */
export function filerScopeOf(
	stored: string | null,
	document: ScenarioDocument,
	status: ThFilingStatus,
): FilerScope | AppError | null {
	if (status !== "married_joint" || stored === null) return null
	const household = JSON.parse(stored) as Household
	const pair = couple(household)
	const owners = resolveOwners(household, document).owners ?? []
	if (pair === null || owners.length === 0) return null
	const ownerOf = new Map(
		owners.flatMap((owner) => {
			const segments = ownedSegments(owner.path)
			return segments === null ? [] : [[segments.join("."), owner.person] as const]
		}),
	)
	const items = [...new Set(taxSlots(document).map((slot) => slot.item))]
	const missing = items.filter((item) => !ownerOf.has(item))
	if (missing.length > 0) return ownerless(missing)
	const owned = new Set(items.map((item) => ownerOf.get(item)))
	const filers = pair.map((person) => person.id).filter((id) => owned.has(id) || owned.has(SHARED))
	if (filers.length === 0) return null
	return unfitFiler(household, filers) ?? { filers, ownerOf }
}

/** The document with each taxed item's label written under its Owner's Filer suffix. */
export function withFilerLabels(document: ScenarioDocument, scope: FilerScope): ScenarioDocument {
	return relabelled(document, (slot) =>
		thFilerLabel(slot.label, scope.ownerOf.get(slot.item) ?? SHARED),
	)
}
