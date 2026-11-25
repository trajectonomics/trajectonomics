/** The space around the plot, in pixels, for the axis labels. */
export interface Margin {
	readonly top: number
	readonly right: number
	readonly bottom: number
	readonly left: number
}

/** The size of the whole chart, in pixels, and its margin. */
export interface Plot {
	readonly width: number
	readonly height: number
	readonly margin: Margin
}

/** One value of a series, placed in pixels, with the string a tooltip shows for it. */
export interface Mark {
	readonly x: number
	readonly y: number
	readonly display: string
}

/** One bar of a column chart, in pixels. */
export interface Bar {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
	/** True when the bar covers part of a period, so it is drawn faded. */
	readonly faded?: boolean
}

/**
 * One series laid out: its path, and a mark per distinct x (null where the series has no point). A
 * column chart's series also carry their bars, or the shaded band of a stacked line.
 */
export interface SeriesLayout {
	readonly name: string
	readonly dashed: boolean
	readonly dotted: boolean
	readonly path: string
	readonly marks: readonly (Mark | null)[]
	readonly bars?: readonly (Bar | null)[]
	readonly area?: string
	/** True for a series that is not money, such as a rate: a tooltip shows it even when amounts are hidden. */
	readonly plain?: boolean
}

/** A second y axis on the right, for a series in other units: its labels and the x its plot ends at. */
export interface RightAxis {
	readonly edge: number
	readonly ticks: readonly { readonly label: string; readonly y: number }[]
}

/** The whole chart laid out: positions, ticks, series and markers, all in pixels. */
export interface LineLayout {
	readonly xLabels: readonly string[]
	/** The longer name of each x for the tooltip, such as the period it covers; absent when the labels say it all. */
	readonly xTitles?: readonly string[]
	readonly xPixels: readonly number[]
	readonly xTicks: readonly {
		readonly index: number
		readonly label: string
		/** The second line under the label, when the points carry one. */
		readonly sub?: string
	}[]
	readonly yTicks: readonly { readonly value: number; readonly y: number }[]
	readonly series: readonly SeriesLayout[]
	readonly markers: readonly { readonly x: number; readonly label: string }[]
	/** "wide" draws series from a longer palette, for a chart of many series; left out, the first three. */
	readonly palette?: "wide"
	/** The labels of a second axis, when a series in other units is drawn against its own scale. */
	readonly rightAxis?: RightAxis
}
