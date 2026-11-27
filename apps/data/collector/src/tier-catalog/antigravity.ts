import { type PlanCatalog, tier } from "./types"

const PLANS = "https://antigravity.google/docs/plans"

/** Google's tiers state quotas in words, not multipliers, except for the Pro plan's base. */
export const antigravity: PlanCatalog = {
	base: "Google AI Pro",
	tiers: [
		tier("Free", null, null, PLANS, "A meaningful quota, refreshed weekly"),
		tier(
			"Google AI Pro",
			1,
			1,
			PLANS,
			"A high, generous quota, refreshed every five hours until the weekly limit is reached",
		),
		tier(
			"Google AI Ultra",
			null,
			null,
			PLANS,
			"The highest, most generous quota, refreshed every five hours",
		),
	],
}
