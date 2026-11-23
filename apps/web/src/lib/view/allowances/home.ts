import type { ProjectionAllowances } from "../../contract"
import { isAboveZero } from "../../format"
import { allowancesView } from "./years"

/** What the Home card says: the tax the current year could still save, and for which year. */
export interface AllowancesSummary {
	readonly saving: string
	readonly currency: string
	readonly period: string
}

/**
 * The card's figures, or null when the current tax year saves nothing more (the card is then not shown) or the
 * As-of falls in no year the read states.
 */
export function allowancesSummaryOf(data: ProjectionAllowances): AllowancesSummary | null {
	const current = allowancesView(data).current
	if (current === null || !isAboveZero(current.saving)) return null
	return { saving: current.saving, currency: data.currency, period: current.period }
}
