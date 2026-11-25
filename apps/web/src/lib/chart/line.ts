/** One point of a line chart: its position, its x label, its value and the string a tooltip shows. */
export interface LinePoint {
	readonly x: number
	readonly xLabel: string
	readonly y: number
	readonly display: string
	/** A longer name for the x, such as the period a point covers; the tooltip shows it in place of `xLabel`. */
	readonly xTitle?: string
	/** A second line under the x label, such as the age of a person that year; a line chart draws it when a point has one. */
	readonly subLabel?: string
	/** True for a point that covers part of a period. A column chart draws it faded. */
	readonly partial?: boolean
}

/** One series of a line chart. A dashed series is told apart from a solid one without colour. */
export interface LineSeries {
	readonly name: string
	readonly dashed?: boolean
	/** A second dash, for a chart of many series: with `dashed` it is a dash and dot pattern. */
	readonly dotted?: boolean
	readonly points: readonly LinePoint[]
}

/** A vertical rule on a line chart: its x position in the chart's own units, and the label it carries. */
export interface LineMarker {
	readonly x: number
	readonly label: string
	/** True when the label is an id no `traj` Read names, which the chart sets in code. */
	readonly code?: boolean
}
