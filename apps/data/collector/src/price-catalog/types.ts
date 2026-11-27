/** A dated public source: the page, the day it was read, and the sentence it states. */
export type PriceSource = {
	url: string
	read: string
	quote: string
}

/**
 * One tier's subscription price in US dollars a month. A null price means the vendor states no
 * official USD figure; a zero price is a free plan, which needs no source.
 */
export type PlanPrice = {
	tier: string
	usdMonth: number | null
	source: PriceSource | null
}

/**
 * One model's list price in US dollars per million tokens. A null cache-write price means the
 * vendor states none; the site then prices a cache write at the input price.
 */
export type ModelPrice = {
	input: number
	output: number
	cacheRead: number
	cacheWrite: number | null
	source: PriceSource
}

/** The day every price in this catalogue was read from its vendor's page. */
export const PRICE_READ = "2026-11-27"

/** One catalogued tier, read on `PRICE_READ` from the page whose sentence states its price. */
export function plan(tier: string, usdMonth: number, url: string, quote: string): PlanPrice {
	return { tier, usdMonth, source: { url, read: PRICE_READ, quote } }
}

/** A tier whose vendor states no official USD price, so the site never divides by one. */
export function unpriced(tier: string): PlanPrice {
	return { tier, usdMonth: null, source: null }
}

/** One catalogued model, read on `PRICE_READ` from the page whose sentence states its prices. */
export function model(
	input: number,
	output: number,
	cacheRead: number,
	cacheWrite: number | null,
	url: string,
	quote: string,
): ModelPrice {
	return {
		input,
		output,
		cacheRead,
		cacheWrite,
		source: { url, read: PRICE_READ, quote },
	}
}
