import type { PeakWindowKey } from "./types"

/** One measured or estimated figure in a window. */
export type TierCell =
	| { kind: "measured"; peak: { tokens: number; fromDay: string } | null }
	| { kind: "estimated"; tokens: number; factor: number; fromTier: string }
	| { kind: "not-stated" }
	| { kind: "not-measured" }

/** One tier's three cells, or the failure to estimate any of them. */
export type TierFigures =
	| { kind: "measured"; tier: string | null; cells: Record<PeakWindowKey, TierCell> }
	| { kind: "estimated"; tier: string; fromTier: string; cells: Record<PeakWindowKey, TierCell> }
	| { kind: "unknown"; tier: string | null }

/** An estimated row's figures, narrowed for the tag that names its source tier. */
export type EstimatedFigures = Extract<TierFigures, { kind: "estimated" }>

/** A cell's token figure, or null when it draws no bar. */
export function cellTokens(cell: TierCell): number | null {
	if (cell.kind === "measured") return cell.peak?.tokens ?? null
	return cell.kind === "estimated" ? cell.tokens : null
}

/** The largest visible figure in a column, so every bar stays comparable. */
export function figuresColumnMax(figures: readonly TierFigures[], key: PeakWindowKey): number {
	let max = 0
	for (const entry of figures) {
		if (entry.kind === "unknown") continue
		const tokens = cellTokens(entry.cells[key])
		if (tokens !== null && tokens > max) max = tokens
	}
	return max
}

/** The factor the row tag shows: the seven-day one when it exists, else the first estimated one. */
export function estimateFactor(figures: EstimatedFigures): number {
	const seven = figures.cells.sevenDays
	if (seven.kind === "estimated") return seven.factor
	for (const key of ["fiveHours", "sevenDays", "thirtyDays"] as const) {
		const cell = figures.cells[key]
		if (cell.kind === "estimated") return cell.factor
	}
	return 1
}

/** A whole factor as `×N` or `÷N`; anything else as `×0.25`. */
export function factorLabel(factor: number): string {
	if (Number.isInteger(factor)) return `×${factor}`
	const inverse = 1 / factor
	if (Number.isInteger(inverse)) return `÷${inverse}`
	return `×${Math.round(factor * 100) / 100}`
}
