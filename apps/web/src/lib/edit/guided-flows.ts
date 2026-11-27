/**
 * The Flow helpers a guided plan applies: which Flows it keeps, the Milestone every kept earned Stream ends at, and
 * the end that Milestone gives them ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * Pure.
 */
import type { ScenarioFlow } from "../contract"

/** The id of the Milestone a guided plan appends, and the end every kept earned Stream takes. */
export const STOP_WORK = "stop-work"

/** Whether a Flow is one of the two kinds a guided plan keeps. */
export function spending(flow: ScenarioFlow): boolean {
	return flow.kind === "income" || flow.kind === "expense"
}

/** The Milestone every kept earned Stream ends at; its date is a placeholder the household write overwrites. */
export function stopWork(asOf: string): unknown {
	return {
		id: STOP_WORK,
		displayLabel: "Stop work",
		combine: "all",
		criteria: [{ id: "age", kind: "date", on: asOf }],
	}
}

/** A kept income Flow that is earned ends at stop-work; every other Flow stays as it is. */
export function endedAt(flow: ScenarioFlow): ScenarioFlow {
	return flow.kind === "income" && flow.earned === true ? { ...flow, endAt: STOP_WORK } : flow
}
