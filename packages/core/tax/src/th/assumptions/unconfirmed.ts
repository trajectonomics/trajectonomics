import { TH_UNCONFIRMED_ALLOWANCES } from "./unconfirmed-allowances"
import { TH_UNCONFIRMED_REGIMES } from "./unconfirmed-regimes"
import type { ThUnconfirmedFigure } from "./unconfirmed-types"

/**
 * Every `TH_2026_PARAMETERS` figure whose source row in `references/th/SOURCES.md` is `reported`
 * or `unsourced`, with what a computation does to rely on it.
 *
 * Purpose: The typed record the assumptions list is read from. A test compares its paths and
 * statuses with the manifest, so a row that becomes `match` fails the test until its entry is
 * removed here, and a new `reported` row fails it until an entry is added.
 * Math: No arithmetic.
 * Units: Each `note` names its figure's unit.
 * Throws: Nothing.
 * @statute Thailand Revenue Code Sections 40–48; `references/th/SOURCES.md`.
 */
export const TH_UNCONFIRMED_FIGURES: readonly ThUnconfirmedFigure[] = [
	...TH_UNCONFIRMED_ALLOWANCES,
	...TH_UNCONFIRMED_REGIMES,
]
