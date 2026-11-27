import {
	type ModelPrice,
	modelPriceOn,
	tokenCost,
} from "@trajectonomics/data-collector/price-catalog"
import type { TableRow } from "./table"

/** A row's tokens without cache reads, the measure every per-token figure divides by. */
export function uncachedTokens(row: TableRow): number {
	return row.tokensTotal - (row.cacheRead ?? 0)
}

/**
 * One model row's cost at list prices, through the collector's own `tokenCost` so the site and
 * the Worker price the same way; a row with no split has nothing to price and costs nothing here.
 */
export function modelCost(row: TableRow, price: ModelPrice): number {
	return tokenCost(row, price) ?? 0
}

/**
 * A plan's blended API price per token: its own usage priced at each model's list price, divided
 * by those rows' tokens without cache reads. Models with no price, and rows with no input/output
 * split, are left out; a plan with no row left gets null.
 */
export function blendedApiCost(rows: readonly TableRow[]): number | null {
	let cost = 0
	let tokens = 0
	for (const row of rows) {
		const price = modelPriceOn(row.model)
		if (price === null) continue
		// A row with no input/output split (a daily export) has no cost to price, so its tokens
		// would only dilute the blend.
		if (row.tokensIn === null && row.tokensOut === null) continue
		cost += modelCost(row, price)
		tokens += uncachedTokens(row)
	}
	return tokens <= 0 ? null : cost / tokens
}
