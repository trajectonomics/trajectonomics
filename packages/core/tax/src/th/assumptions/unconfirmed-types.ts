import type { ThAssumptionFact } from "./facts"

/**
 * How little a statutory figure's source says, mirroring the `reported` and `unsourced` results of
 * `references/th/SOURCES.md`.
 */
export type ThAssumptionStatus = "reported" | "unsourced"

/**
 * One Thai statutory figure whose source is not confirmed.
 *
 * Purpose: Says which `TH_2026_PARAMETERS` figure is unconfirmed, what to tell the reader about it,
 * and which things a computation does that make it rely on the figure.
 * Math: No arithmetic.
 * Units: `note` names the unit of the figure; the figure itself stays in `TH_2026_PARAMETERS`.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40–48; `references/th/SOURCES.md`.
 */
export interface ThUnconfirmedFigure {
	/** Collapsed parameter path, as in `references/th/SOURCES.md`. */
	readonly path: string
	/** Why the figure is unconfirmed. */
	readonly status: ThAssumptionStatus
	/** A short plain sentence naming the figure and its unit. */
	readonly note: string
	/** The figure is relied on when the computation did any one of these. */
	readonly usedBy: readonly ThAssumptionFact[]
}
