import { type PlanCatalog, tier } from "./types"

const DOCS = "https://opencode.ai/docs/go/"

/**
 * Go Plus sits above Go, but its page states no multiplier. A multiplier is never inferred from a
 * price, so its two windows stay null.
 */
export const opencodeGo: PlanCatalog = {
	base: "Go",
	tiers: [
		tier("Go", 1, 1, DOCS, "The 5-hour limit is 20% of your monthly allowance."),
		tier("Go Plus", null, null, DOCS, "Higher usage limits across the models below"),
	],
}
