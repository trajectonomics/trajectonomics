import type { ChanceBand } from "@trajectonomics/core/sim"
import { type Money, percentilesOf, valueAt } from "./chance-spending"
import type { ChanceTableRow } from "./chance-spending-view"
import type { ChanceBandView } from "./chance-view"

/*
 * The Bands in each Market path's own today's money (sim ADR 0033): the engine states `realBands`
 * only when the Return model carries an inflation factor, so a run without one keeps every byte.
 */

/** The engine's real Bands in the CLI's money, or none without an inflation factor. */
export function realBandsOf(
	bands: readonly ChanceBand[] | undefined,
	money: Money,
): ChanceBandView[] | undefined {
	return bands?.map((band) => ({
		index: band.index,
		to: band.to,
		netWorth: percentilesOf(band.netWorth, money),
	}))
}

/** Each shown row's median in today's money, joined to the nominal row by its roll-up index. */
export function withRealMedian(
	rows: readonly ChanceTableRow[],
	realBands: readonly ChanceBandView[] | undefined,
): ChanceTableRow[] {
	if (realBands === undefined) return [...rows]
	const byIndex = new Map(realBands.map((band) => [band.index, band.netWorth]))
	return rows.map((row) => {
		const real = byIndex.get(row.index)
		return real === undefined ? row : { ...row, p50Real: valueAt(real, 50) }
	})
}
