import type { ProjectionAllowances } from "../../contract"
import { isAboveZero } from "../../format"
import { NO_PEOPLE, type PersonNames, personText } from "../item-names"
import { allowancesView } from "./years"

/** One Return's saving on the Home card: the CLI's own figure, and the words the household gives its Filer. */
export interface AllowancesSaving {
	readonly key: string
	/** "You", "Your partner", or the label the household states; null when the read states one Return. */
	readonly name: string | null
	readonly saving: string
}

/** What the Home card says: each Return's saving for the current tax year, and for which year. */
export interface AllowancesSummary {
	readonly savings: readonly AllowancesSaving[]
	readonly currency: string
	readonly period: string
}

/**
 * The card's figures, or null when no Return of the current tax year saves more (the card is not shown) or the
 * As-of falls in no year the read states. One Return keeps one unnamed figure, as the card always showed it. A
 * separate filing's several Returns are listed under the household's words, each at the CLI's own figure: the page
 * never adds them.
 */
export function allowancesSummaryOf(
	data: ProjectionAllowances,
	people: PersonNames = NO_PEOPLE,
): AllowancesSummary | null {
	const view = allowancesView(data)
	const several = view.returns.length > 1
	const currents = several
		? view.returns.flatMap((one) =>
				one.current === null
					? []
					: [
							{
								key: one.key,
								name: one.filer === null ? "Your joint Return" : personText(people, one.filer),
								year: one.current,
							},
						],
			)
		: view.current === null
			? []
			: [{ key: view.current.key, name: null, year: view.current }]
	if (!currents.some((one) => isAboveZero(one.year.saving))) return null
	return {
		savings: currents.map((one) => ({ key: one.key, name: one.name, saving: one.year.saving })),
		currency: data.currency,
		period: currents[0]?.year.period ?? "",
	}
}
