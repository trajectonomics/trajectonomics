import type { ProjectionChance } from "../../contract"
import { yearOf } from "../../format"
import { chanceSummaryOf } from "./page"

/** The Chance of success page's focus point: the share, the counts, and the year the plan has to last to. */
export interface ChanceFocus {
	/** The question and the answer, for the sr-only heading. */
	readonly label: string
	/** The chance from the CLI's basis points, through `trimPercent`: "96.5%". */
	readonly share: string
	readonly succeeded: number
	readonly paths: number
	/** The Horizon's year, as a small tick under the squares: "2053". */
	readonly endYear: string
}

/** The focus point of one chance read. A share is a rate, not money, so Hide amounts leaves it as it is. */
export function chanceFocusView(data: ProjectionChance): ChanceFocus {
	const summary = chanceSummaryOf(data)
	return {
		label: `How likely is your plan to last? ${summary.share} chance. ${summary.lasts}`,
		share: summary.share,
		succeeded: summary.succeeded,
		paths: summary.paths,
		endYear: yearOf(data.horizon),
	}
}
