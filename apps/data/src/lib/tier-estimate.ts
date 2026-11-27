import type { PlanCatalog } from "@trajectonomics/data-collector/tier-catalog"
import { estimateFactor, type TierCell, type TierFigures } from "./tier-cells"
import { catalogTier, estimateCell, measuredCells } from "./tier-scale"
import type { MeasuredTier, PeakWindowKey } from "./types"

export type { EstimatedFigures, TierCell, TierFigures } from "./tier-cells"
export { cellTokens, estimateFactor, factorLabel, figuresColumnMax } from "./tier-cells"

/** The fields a plan row carries into the estimate. */
export type FigurePlan = Pick<MeasuredTier, "tier" | "fiveHours" | "sevenDays" | "thirtyDays">

const WINDOWS: readonly PeakWindowKey[] = ["fiveHours", "sevenDays", "thirtyDays"]

/**
 * The three figures a picked tier shows: its measured figures when we have them, otherwise
 * estimates scaled from a measured tier, otherwise nothing when the vendor states no multiplier.
 */
export function tierFigures(
	plan: FigurePlan,
	picked: string | null,
	measured: readonly MeasuredTier[],
	catalog: PlanCatalog | null | undefined,
): TierFigures {
	const exact = measured.find((entry) => entry.tier === picked)
	const pickedTier = catalog ? catalogTier(catalog, picked) : null
	if (pickedTier === null || !catalog) {
		return exact === undefined
			? { kind: "unknown", tier: picked }
			: { kind: "measured", tier: picked, cells: measuredCells(exact) }
	}
	const estimate = (key: PeakWindowKey): TierCell =>
		estimateCell(pickedTier, plan.tier, measured, catalog, key)
	const cells =
		exact === undefined
			? {
					fiveHours: estimate("fiveHours"),
					sevenDays: estimate("sevenDays"),
					thirtyDays: estimate("thirtyDays"),
				}
			: higherFloors(measuredCells(exact), estimate)
	return rowOf(picked, cells, exact !== undefined)
}

/** A row is estimated when any cell is, named after the seven-day source tier when it has one. */
function rowOf(
	picked: string | null,
	cells: Record<PeakWindowKey, TierCell>,
	wasMeasured: boolean,
): TierFigures {
	const ordered = [cells.sevenDays, ...WINDOWS.map((key) => cells[key])]
	const source = ordered.find((cell) => cell.kind === "estimated")
	if (source === undefined || source.kind !== "estimated" || picked === null) {
		return wasMeasured
			? { kind: "measured", tier: picked, cells }
			: { kind: "unknown", tier: picked }
	}
	return { kind: "estimated", tier: picked, fromTier: source.fromTier, cells }
}

/**
 * Per window, the larger of what we used and the scaled figure: both are true lower bounds on the
 * picked tier's limit, so the larger one says more. A tier we used for one hour would otherwise
 * show a floor far below what its stated multiplier already proves.
 */
function higherFloors(
	measuredCells: Record<PeakWindowKey, TierCell>,
	estimate: (key: PeakWindowKey) => TierCell,
): Record<PeakWindowKey, TierCell> {
	const pick = (key: PeakWindowKey): TierCell => {
		const own = measuredCells[key]
		const scaled = estimate(key)
		if (scaled.kind !== "estimated") return own
		const ownTokens = own.kind === "measured" ? (own.peak?.tokens ?? null) : null
		return ownTokens !== null && ownTokens >= scaled.tokens ? own : scaled
	}
	return {
		fiveHours: pick("fiveHours"),
		sevenDays: pick("sevenDays"),
		thirtyDays: pick("thirtyDays"),
	}
}

/** The factor the row tag shows, for a row whose figures are estimated. */
export function tagFactor(figures: TierFigures): number {
	return figures.kind === "estimated" ? estimateFactor(figures) : 1
}
