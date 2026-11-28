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

/** The token kinds one hour or row reports; a null part is a kind its source did not report. */
export type TokenParts = {
	tokensIn: number | null
	tokensOut: number | null
	cacheRead: number | null
	cacheWrite: number | null
}

const PER_MILLION = 1_000_000

/**
 * One set of token kinds at a model's list prices, in US dollars. Null when the row has no
 * input/output split at all, because there is no usage to price; every null part otherwise counts
 * as zero, and a cache write with no stated price is priced as input.
 */
export function tokenCost(parts: TokenParts, price: ModelPrice): number | null {
	if (parts.tokensIn === null && parts.tokensOut === null) return null
	const writePrice = price.cacheWrite ?? price.input
	const tokens =
		(parts.tokensIn ?? 0) * price.input +
		(parts.tokensOut ?? 0) * price.output +
		(parts.cacheRead ?? 0) * price.cacheRead +
		(parts.cacheWrite ?? 0) * writePrice
	return tokens / PER_MILLION
}

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
	const key = modelKey(model)
	return Object.hasOwn(MODEL_PRICES, key) ? (MODEL_PRICES[key] ?? null) : null
}
