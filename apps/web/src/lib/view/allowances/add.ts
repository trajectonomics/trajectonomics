import type { AllowanceFlow, ScenarioDocument } from "../../contract"
import type { Addition } from "../../what-if/additions"
import { recordOf } from "../../what-if/session"

/**
 * The plan's document with a year's suggestions put on its Flows, in the order the CLI gave them. Each Flow is
 * the CLI's, in the decimal form `apply-plan` takes, so nothing is read or changed here.
 */
export function documentWithSuggestions(
	doc: ScenarioDocument,
	flows: readonly AllowanceFlow[],
): ScenarioDocument {
	return { ...doc, flows: [...doc.flows, ...flows.map((flow) => ({ ...flow }))] }
}

/** A year's suggestions as the Additions of a what-if: one `--add flows=<json>` each (cli ADR-0062). */
export function suggestionAdditions(flows: readonly AllowanceFlow[]): Addition[] {
	return flows.map((flow) => ({ list: "flows", item: recordOf(flow) }))
}
