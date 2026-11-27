import { thFilerLabel } from "@trajectonomics/core/tax/th"
import type { AppError } from "../../errors"
import type { ScenarioDocument } from "../document"
import type { Household, Owner } from "../household/model"
import { SHARED } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
import { type Couple, coupleIn } from "./couple"
import { relabelled, taxSlots } from "./filer-labels"
import { ownerless, unfitFiler } from "./filer-refusals"
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

/** The Filers of a Return, or `null` when the plan keeps bare labels. */
type Decided = { pair: Couple; owners: readonly Owner[]; household: Household }

/** The plan's two people and Owners, or null when it has no partner or no Owners. */
function decided(household: Household | null, document: ScenarioDocument): Decided | null {
	if (household === null) return null
	const pair = coupleIn(household)
	if (pair === null) return null
	const owners = resolveOwners(household, document).owners ?? []
	return owners.length === 0 ? null : { pair, owners, household }
}

/**
 * The Filers of a Return, or `null` when the plan keeps bare labels: another filing status, a
 * household with no partner or no Owners, or no taxed item at all. A Filer has income when a
 * taxed item is theirs or `shared`; a taxed item with no Owner is refused.
 */
export function filerScopeOf(
	household: Household | null,
	document: ScenarioDocument,
	status: ThFilingStatus,
): FilerScope | AppError | null {
	if (status !== "married_joint" && status !== "married_separate") return null
	const held = decided(household, document)
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
	return (
		unfitFiler(held.household, status, filers) ?? {
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
