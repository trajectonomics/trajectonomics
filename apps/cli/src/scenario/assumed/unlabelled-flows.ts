import type { ScenarioDocument } from "../document"
import type { Household } from "../household/model"
import { resolveOwners } from "../household/owner-held"
import { ownedSegments } from "../household/owner-rules"
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
