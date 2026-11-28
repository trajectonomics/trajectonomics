import type { ScenarioDocument } from "../document"
import { type Household, SHARED } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
import { formatPath } from "../path"
import { taxSlots } from "../tax/filer-labels"
import { flowsOf } from "../tax/labels"

/** One unlabelled income Flow, and the person who owns it when the household says. */
export type Flow = { id: string; owner: string | undefined }

/** The people who can own an income Flow and file: the holder and the partner, never a dependent. */
export function earnersOf(household: Household | null): string[] {
	return (household?.people ?? [])
		.filter((person) => person.role !== "dependent")
		.map((person) => person.id)
}

/** Each owned Flow's person, keyed as its tax slot names it, `flows.<id>`. */
function ownersOf(household: Household | null, document: ScenarioDocument): Map<string, string> {
	const owners = household === null ? [] : (resolveOwners(household, document).owners ?? [])
	return new Map(
		owners.flatMap((owner) => {
			const segments = ownedSegments(owner.path)
			return segments === null ? [] : [[segments.join("."), owner.person] as const]
		}),
	)
}

/** The unlabelled income Flows of a document, each with its Owner when the household says one. */
export function unlabelledFlowsOf(household: Household | null, document: ScenarioDocument): Flow[] {
	const owners = ownersOf(household, document)
	return flowsOf(document)
		.filter((flow) => flow["kind"] === "income" && typeof flow["label"] !== "string")
		.map((flow) => {
			const id = String(flow["id"] ?? "")
			return { id, owner: owners.get(`flows.${id}`) }
		})
}

/** The Override path of one taxed item, whose `taxSlots` key is `flows.<id>` or `accounts.<id>`. */
function taxedPath(item: string): string {
	const at = item.indexOf(".")
	return formatPath([item.slice(0, at), item.slice(at + 1)])
}

/**
 * The people a Levy over Filers already writes a Return for: each Owner of a taxed Flow or Account,
 * or everybody when one is owned by `shared` (cli ADR-0075).
 */
export function filersOf(household: Household | null, document: ScenarioDocument): Set<string> {
	const owners = ownersOf(household, document)
	const held = new Set(
		taxSlots(document).flatMap((slot) => {
			const owner = owners.get(slot.item)
			return owner === undefined ? [] : [owner]
		}),
	)
	const people = earnersOf(household)
	return new Set(held.has(SHARED) ? people : people.filter((id) => held.has(id)))
}

/**
 * Every path a tax write needs an Owner for and the household gives none: each taxed Flow or
 * Account (cli ADR-0075), then each unlabelled income Flow, in document order (cli ADR-0083).
 */
export function ownerlessPathsOf(
	household: Household | null,
	document: ScenarioDocument,
): string[] {
	const owners = ownersOf(household, document)
	const taxed = taxSlots(document).flatMap((slot) =>
		owners.has(slot.item) ? [] : [taxedPath(slot.item)],
	)
	const unlabelled = unlabelledFlowsOf(household, document).flatMap((flow) =>
		flow.owner === undefined ? [formatPath(["flows", flow.id])] : [],
	)
	return [...new Set([...taxed, ...unlabelled])]
}
