/** One point of a line chart: its position, its x label, its value and the string a tooltip shows. */
export interface LinePoint {
	readonly x: number
	readonly xLabel: string
	readonly y: number
	readonly display: string
}

/** One series of a line chart. A dashed series is told apart from a solid one without colour. */
export interface LineSeries {
	readonly name: string
	readonly dashed?: boolean
	readonly points: readonly LinePoint[]
}

/** A vertical rule on a line chart: its x position in the chart's own units, and the label it carries. */
export interface LineMarker {
	readonly x: number
	readonly label: string
}
