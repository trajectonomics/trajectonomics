import { thFilerLabel } from "@trajectonomics/core/tax/th"
import { type AppError, fail } from "../../errors"
import type { ScenarioDocument } from "../document"
import type { Household, Owner, Person } from "../household/model"
import { SHARED } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
import { type Couple, coupleOf } from "./couple"
import { relabelled, taxSlots } from "./filer-labels"
import type { ThFilingStatus } from "./flags"

/*
 * Who files a Return (cli ADR-0075). A plan whose household has a partner and Owners writes one
 * Levy over both Filers when it files jointly, and one Levy per Filer when it files separately. A
 * plan without both writes the bare labels it always wrote.
 */

/** The Filers of a Return, and which of them owns each taxed item. */
export type FilerScope = {
	/** `joint` is one Levy over every Filer; `separate` is one Levy per Filer. */
	kind: "joint" | "separate"
	/** The Filer ids, the holder first, only the people who have income. */
	filers: string[]
	/** The Owner's Filer id of each taxed item, `shared` for both. */
	ownerOf: ReadonlyMap<string, string>
}

/** The refusal listing each taxed item that has no Owner, the way an unlabelled income Flow is refused. */
function ownerless(status: string, items: readonly string[]): AppError {
	return fail("invalid_input", {
		path: "document",
		message: `With --filing-status ${status} and Owners in the household, every taxed Flow and Account needs an Owner; ${
			items.length === 1 ? "one item has" : `${items.length} items have`
		} none, so tax could not say whose income it is.`,
		hint: 'Add each item to "owners" in the household, as {"path": "flows.<id>", "person": "<person id>"} or "shared", then run "traj scenario household" again.',
		details: { items },
	})
}

/** The refusal for a person whose id cannot be a Filer label's suffix. */
function unfit(status: string, person: Person, index: number): AppError {
	return fail("invalid_input", {
		path: "filingStatus",
		message: `--filing-status ${status} needs each Filer's id to be 1 to 32 lowercase letters, digits or hyphens, and people.${index}.id "${person.id}" is not.`,
		hint: 'Rename the person with "traj scenario household" (an id such as "me" or "partner"), then write the tax again.',
		details: { field: `people.${index}.id`, person: person.id },
	})
}

/** The first Filer id tax refuses as a label's suffix, or null when every one fits. */
function unfitFiler(
	household: Household,
	status: string,
	filers: readonly string[],
): AppError | null {
	for (const id of filers) {
		try {
			thFilerLabel("x", id)
		} catch {
			const index = household.people.findIndex((person) => person.id === id)
			return unfit(status, household.people[index] as Person, index)
		}
	}
	return null
}

/** The Filers of a Return, or `null` when the plan keeps bare labels. */
type Decided = { pair: Couple; owners: readonly Owner[] }

/** The plan's two people and Owners, or null when it has no partner or no Owners. */
function decided(household: string | null, document: ScenarioDocument): Decided | null {
	const pair = coupleOf(household)
	if (pair === null || household === null) return null
	const owners = resolveOwners(JSON.parse(household) as Household, document).owners ?? []
	return owners.length === 0 ? null : { pair, owners }
}

/**
 * The Filers of a Return, or `null` when the plan keeps bare labels: another filing status, a
 * household with no partner or no Owners, or no taxed item at all. A Filer has income when a
 * taxed item is theirs or `shared`; a taxed item with no Owner is refused.
 */
export function filerScopeOf(
	stored: string | null,
	document: ScenarioDocument,
	status: ThFilingStatus,
): FilerScope | AppError | null {
	if (status !== "married_joint" && status !== "married_separate") return null
	const held = decided(stored, document)
	if (held === null) return null
	const ownerOf = new Map(
		held.owners.flatMap((owner) => {
			const segments = ownedSegments(owner.path)
			return segments === null ? [] : [[segments.join("."), owner.person] as const]
		}),
	)
	const items = [...new Set(taxSlots(document).map((slot) => slot.item))]
	const missing = items.filter((item) => !ownerOf.has(item))
	if (missing.length > 0) return ownerless(status, missing)
	const owned = new Set(items.map((item) => ownerOf.get(item)))
	const filers = [held.pair.holder.id, held.pair.partner.id].filter(
		(id) => owned.has(id) || owned.has(SHARED),
	)
	if (filers.length === 0) return null
	const household = JSON.parse(stored as string) as Household
	return (
		unfitFiler(household, status, filers) ?? {
			kind: status === "married_separate" ? "separate" : "joint",
			filers,
			ownerOf,
		}
	)
}

/** The document with each taxed item's label written under its Owner's Filer suffix. */
export function withFilerLabels(document: ScenarioDocument, scope: FilerScope): ScenarioDocument {
	return relabelled(document, (slot) =>
		thFilerLabel(slot.label, scope.ownerOf.get(slot.item) ?? SHARED),
	)
}
