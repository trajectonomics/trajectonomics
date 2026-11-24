/** One part of a whole: its label, the CLI's amount string, and the number its width is drawn from. */
export interface CompositionSegment {
	readonly label: string
	readonly amount: string
	/** A non-negative number, placed as the segment's width. Never shown. */
	readonly value: number
}

/** One series of a chart in its legend: its name, whether it is dashed, and its stroke class. */
export interface LegendItem {
	readonly name: string
	readonly dashed: boolean
	readonly dotted?: boolean
	readonly stroke: string
}

/** One row of a hover tooltip: the series, the string it shows and its stroke class. */
export interface TooltipRow {
	readonly name: string
	/** The string the tooltip shows: the CLI's figure, already masked when amounts are hidden. */
	readonly display: string
	readonly stroke: string
}
