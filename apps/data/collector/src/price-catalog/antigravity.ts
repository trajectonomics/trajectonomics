import { type PlanPrice, plan, unpriced } from "./types"

const BLOG =
	"https://blog.google/products-and-platforms/products/google-one/google-ai-subscriptions"

/**
 * Google's tiers: Ultra has a stated monthly price; Pro has no official USD figure we could find,
 * and the site never infers one from a neighbouring tier.
 */
export const antigravity: readonly PlanPrice[] = [
	unpriced("Google AI Pro"),
	plan(
		"Google AI Ultra",
		200,
		BLOG,
		"reducing the monthly price of our top-tier AI Ultra plan from $250 to $200.",
	),
]
