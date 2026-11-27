import { type ModelPrice, modelPriceOn } from "@trajectonomics/data-collector/price-catalog"
import type { TableRow } from "./table"

const PER_MILLION = 1_000_000

/** A row's tokens without cache reads, the measure every per-token figure divides by. */
export function uncachedTokens(row: TableRow): number {
	return row.tokensTotal - (row.cacheRead ?? 0)
}

/** One model row's cost at list prices; a cache write with no price is priced as input. */
export function modelCost(row: TableRow, price: ModelPrice): number {
	const writePrice = price.cacheWrite ?? price.input
	const tokens =
		(row.tokensIn ?? 0) * price.input +
		(row.tokensOut ?? 0) * price.output +
		(row.cacheRead ?? 0) * price.cacheRead +
		(row.cacheWrite ?? 0) * writePrice
	return tokens / PER_MILLION
}

/**
 * A plan's blended API price per token: its own usage priced at each model's list price, divided
 * by those rows' tokens without cache reads. Models with no price are left out; a plan whose
 * models all lack one gets null.
 */
export function blendedApiCost(rows: readonly TableRow[]): number | null {
	let cost = 0
	let tokens = 0
	for (const row of rows) {
		const price = modelPriceOn(row.model)
		if (price === null) continue
		cost += modelCost(row, price)
		tokens += uncachedTokens(row)
	}
	return tokens <= 0 ? null : cost / tokens
}
