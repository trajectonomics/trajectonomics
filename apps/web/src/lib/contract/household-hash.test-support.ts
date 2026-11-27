import type { ScenarioShow } from "./scenario-show"

/** A fixture's household hash. The contract brands it, so a test states one on purpose and never passes a `contentHash`. */
export function brandHouseholdHash(text: string): ScenarioShow["scenario"]["householdHash"] {
	return text as ScenarioShow["scenario"]["householdHash"]
}
