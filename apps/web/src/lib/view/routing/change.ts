/**
 * One change to a plan's routing, as data (web ADR 0022): a whole routing list in its new order and content, a transfer put
 * in, or a transfer taken out. The same value is saved as one `apply-plan` Edit (`documentWith`) or tried in the What-if
 * session (`sessionWith`), so the two cannot disagree about what the change is.
 */
import type { ScenarioDocument, ScenarioFlow } from "../../contract"
import { withTriedList } from "../../what-if/routing"
import {
	recordOf,
	switchedOff,
	type WhatIf,
	withoutAddition,
	withoutItemChanges,
} from "../../what-if/session"
import { withTriedFlow } from "../../what-if/try-flow"
import { upsert, without } from "../plan-items/document"
import { type ListName, withList } from "./entries"

export type RoutingChange =
	| { kind: "list"; list: ListName; items: readonly unknown[] }
	| { kind: "transfer"; flow: ScenarioFlow }
	| { kind: "remove"; id: string }

/** The plan with the change made. Its other sections are kept as they are. */
export function documentWith(doc: ScenarioDocument, change: RoutingChange): ScenarioDocument {
	if (change.kind === "list") {
		return withList(doc, change.list, change.items as never)
	}
	if (change.kind === "transfer") return { ...doc, flows: upsert(doc.flows, change.flow) }
	return { ...doc, flows: without(doc.flows, change.id) }
}

/** The ids of the plan's Flows after the change, in order: the document the Edit sends, which a refusal's position names. */
export function flowIdsAfter(doc: ScenarioDocument, change: RoutingChange): string[] {
	return documentWith(doc, change).flows.map((flow) => flow.id)
}

/** The session with the change tried in it, over the plan as it is stored (a try replaces an earlier try of the same thing). */
export function sessionWith(
	whatIf: WhatIf,
	stored: ScenarioDocument,
	change: RoutingChange,
): WhatIf {
	if (change.kind === "list") return withTriedList(whatIf, change.list, change.items)
	if (change.kind === "transfer") {
		const before = stored.flows.find((flow) => flow.id === change.flow.id)
		const edited = { ...recordOf(change.flow), id: change.flow.id }
		return withTriedFlow(whatIf, {
			stored: before === undefined ? undefined : recordOf(before),
			edited,
		})
	}
	const path = `flows.${change.id}`
	const base = withoutItemChanges(whatIf, "flows", change.id)
	return stored.flows.some((flow) => flow.id === change.id)
		? switchedOff(base, path)
		: withoutAddition(base, path)
}
