import { type PlanCatalog, tier } from "./types"

const PRICING = "https://cursor.com/docs/models-and-pricing"

/** Cursor states a usage pool, not a 5-hour figure, so only its weekly multiplier is known. */
export const cursor: PlanCatalog = {
	base: "Plus",
	tiers: [
		tier("Plus", null, 1, PRICING, "Plus | Base"),
		tier("Premium", null, 4, PRICING, "Everything in Plus, with 4x the usage."),
		tier("Super", null, 15, PRICING, "Everything in Premium, with 15x Plus usage"),
		tier("Ultra", null, 50, PRICING, "Everything in Super, with 50x Plus usage"),
	],
}
