import { type PlanCatalog, tier } from "./types"

const PRICING = "https://claude.com/pricing"
const MAX = "https://support.claude.com/en/articles/11049741-what-is-the-max-plan"
const ULTRA = "https://support.claude.com/en/articles/17728952-what-is-the-ultra-plan"

/** Anthropic's current lineup: Pro, Max (5x) and Ultra (formerly Max 20x). */
export const claude: PlanCatalog = {
	base: "Pro",
	tiers: [
		tier(
			"Pro",
			1,
			1,
			PRICING,
			"Limit every 5 hours: Pro 1x, Max 5x; limit every week: Pro 1x, Max 5x, Ultra 10x",
		),
		tier("Max", 5, 5, MAX, "Get five times the Pro plan's usage every five hours and every week."),
		tier(
			"Ultra",
			null,
			10,
			ULTRA,
			"Get 10 times the Pro plan's usage every week. Verified Ultra accounts don't have a five-hour limit.",
		),
	],
}
