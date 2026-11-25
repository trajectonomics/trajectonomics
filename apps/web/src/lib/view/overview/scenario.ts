import type { Read, Snapshot } from "../../contract"
import { chooseScenario } from "../plan"
import { mapRead } from "./map-read"

/** The plan Home shows: the one rule of `chooseScenario`, over the Snapshot's planned plans, main first. */
export function homePlan(snapshot: Snapshot, requested: string): string | null {
	return chooseScenario(snapshot.params.scenarios, requested)
}

/** A card's Scenario: none to show, a Scenario with no Read in the Snapshot, or its Read. */
export type ScenarioView<T> =
	| { readonly status: "none" }
	| { readonly status: "unread"; readonly name: string }
	| { readonly status: "ready"; readonly name: string; readonly read: Read<T> }

/** The Scenario's Read from a record keyed by Scenario name, or "unread" when the record lacks it. */
export function scenarioView<T>(
	name: string | null,
	reads: Readonly<Record<string, Read<T>>>,
): ScenarioView<T> {
	if (name === null) return { status: "none" }
	const read = Object.hasOwn(reads, name) ? reads[name] : undefined
	return read === undefined ? { status: "unread", name } : { status: "ready", name, read }
}

/** The same card state with its ready Read's data mapped; the other states pass through. */
export function mapScenario<T, U>(view: ScenarioView<T>, map: (data: T) => U): ScenarioView<U> {
	if (view.status !== "ready") return view
	return { status: "ready", name: view.name, read: mapRead(view.read, map) }
}
