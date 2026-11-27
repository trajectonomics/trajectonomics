import type { PlanId } from "./plans"
import { antigravity } from "./price-catalog/antigravity"
import { claude } from "./price-catalog/claude"
import { commandCode } from "./price-catalog/command-code"
import { cursor } from "./price-catalog/cursor"
import { mistral } from "./price-catalog/mistral"
import { claudeModels } from "./price-catalog/models-claude"
import { otherModels } from "./price-catalog/models-other"
import { opencodeFree } from "./price-catalog/opencode-free"
import { opencodeGo } from "./price-catalog/opencode-go"
import type { ModelPrice, PlanPrice } from "./price-catalog/types"

export type { ModelPrice, PlanPrice, PriceSource } from "./price-catalog/types"
export { PRICE_READ } from "./price-catalog/types"

/**
 * The hand-kept subscription catalogue: every tier whose monthly USD price its vendor states. A
 * plan absent here has no price, and a tier with a null price is never divided by.
 */
export const PLAN_PRICES: Partial<Record<PlanId, readonly PlanPrice[]>> = Object.freeze({
	claude,
	cursor,
	"opencode-go": opencodeGo,
	"opencode-free": opencodeFree,
	antigravity,
	"command-code": commandCode,
	mistral,
})

/**
 * The hand-kept model catalogue: list prices per million tokens, keyed by the model id the usage
 * rows carry (without a provider prefix). An absent model has no price.
 */
export const MODEL_PRICES: Readonly<Record<string, ModelPrice>> = Object.freeze({
	...claudeModels,
	...otherModels,
})

/** A model id without its provider prefix, which usage rows may carry. */
export function modelKey(model: string): string {
	const slash = model.lastIndexOf("/")
	return slash === -1 ? model : model.slice(slash + 1)
}

/** The catalogue entry for a plan's tier, or null when the catalogue prices neither. */
export function planPriceOn(plan: string, tier: string | null): PlanPrice | null {
	if (tier === null || !Object.hasOwn(PLAN_PRICES, plan)) return null
	const prices = PLAN_PRICES[plan as PlanId] ?? []
	return prices.find((entry) => entry.tier === tier) ?? null
}

/** The catalogue entry for a model id, provider prefix or not; null when no page prices it. */
export function modelPriceOn(model: string): ModelPrice | null {
	return MODEL_PRICES[modelKey(model)] ?? null
}
