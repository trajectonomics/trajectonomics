import type { ProjectionChance } from "../../contract"
import { formatDate, formatShare, trimPercent, yearOf } from "../../format"
import { type ChanceSource, chanceSourceWords } from "../assumptions/chance"
import { type BandsByBasis, bandsOf } from "./bands"
import { chanceLasts } from "./words"

/**
 * A roll-up's year is labelled on every fifth bar, and on every tenth once the row passes 50 bars, so a
 * row of many bars keeps a readable axis: at 360px, 60 bars are about 5px apart and a year is 26px wide.
 */
const LABEL_EVERY = 5
const BARS_PER_LABEL_STEP = 50

/** The share and its facts, as the Home card shows them. Every figure is the CLI's, shown as it stands. */
export interface ChanceSummary {
	/** The chance, from the CLI's basis points, with its trailing zeros dropped: "87.3%". */
	readonly share: string
	readonly succeeded: number
	readonly paths: number
	/** "Lasts to 2028 in 174 of 200 markets." */
	readonly lasts: string
	readonly currency: string
	/** The CLI's own sentences, which a person should read beside the figures. */
	readonly notes: readonly string[]
}

/** One failing-path count at one roll-up, with the year on every fifth bar and a title for each. */
export interface RunsOutBar {
	readonly label: string | null
	/** The roll-up's end, as a date. */
	readonly ends: string
	readonly paths: number
	readonly title: string
}

/** The whole Chance of success page for one Scenario: the summary, the inputs, the Bands and the bars. */
export interface ChanceView extends ChanceSummary, BandsByBasis {
	readonly definition: ProjectionChance["definition"]
	readonly runsOut: readonly RunsOutBar[]
	/** Where the Return model came from: the plan's own Accounts, or a file (web ADR 0018). */
	readonly source: ChanceSource
}

/** The summary of one chance read: the share and the facts beside it. */
export function chanceSummaryOf(read: ProjectionChance): ChanceSummary {
	return {
		share: trimPercent(formatShare(read.successBps)),
		succeeded: read.succeeded,
		paths: read.paths,
		lasts: chanceLasts(read.succeeded, read.paths, read.horizon),
		currency: read.currency,
		notes: read.notes,
	}
}

/** The whole page view of one chance read. Pure: the chart's numbers are placed from the CLI's strings. */
export function chanceViewOf(read: ProjectionChance): ChanceView {
	const bands = bandsOf(read)
	return {
		...chanceSummaryOf(read),
		definition: read.definition,
		...bands,
		runsOut: runsOutBarsOf(read.runsOut),
		notes: read.notes,
		source: chanceSourceWords(read),
	}
}

/** The bars of the failing paths by roll-up, in order, with a label on every fifth year (see LABEL_EVERY). */
export function runsOutBarsOf(rows: ProjectionChance["runsOut"]): RunsOutBar[] {
	const every = LABEL_EVERY * Math.ceil(rows.length / BARS_PER_LABEL_STEP)
	return rows.map((row) => {
		const year = yearOf(row.to)
		const noun = row.paths === 1 ? "path runs" : "paths run"
		return {
			label: row.index % every === 0 ? year : null,
			ends: formatDate(row.to),
			paths: row.paths,
			title: `${row.paths} failing ${noun} out in ${year}`,
		}
	})
}
