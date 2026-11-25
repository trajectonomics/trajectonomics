import type { Read, Snapshot, SnapshotParams } from "../../contract"
import { mainPlan } from "../plans/rows"
import { mapRead } from "./map-read"

/**
 * The Scenario an Overview card reads: the one the address bar names, else the main plan, else the one a
 * comparison names first, else the first Scenario the Snapshot was planned for. A name that is not one the
 * Snapshot was planned for is passed over. Null when the Snapshot names none.
 */
export function primaryScenario(
	params: SnapshotParams,
	requested = "",
	main: string | null = null,
): string | null {
	const projected = (name: string | null): name is string =>
		name !== null && params.scenarios.includes(name)
	if (projected(requested)) return requested
	if (projected(main)) return main
	return params.compare?.a ?? params.scenarios[0] ?? null
}

/**
 * The plan Home is asked for: the one the address bar names, else the plan a What-if session holds changes on, so
 * a person who tries a change on a plan and opens Home sees that plan's cards and the session beside them.
 * An empty string asks for neither, and `homePlan` then follows the main plan.
 */
export function requestedPlan(address: string, session: string | null): string {
	return address !== "" ? address : (session ?? "")
}

/** The plan Home shows for a Snapshot: see `primaryScenario`. The main plan is the one `scenario list` marks. */
export function homePlan(snapshot: Snapshot, requested: string): string | null {
	return primaryScenario(snapshot.params, requested, mainPlan(snapshot))
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
