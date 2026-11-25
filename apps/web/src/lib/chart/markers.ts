import type { LineMarker } from "./line"

/** One marker on a laid-out chart: its x in pixels, and the label it carries. */
export interface PlacedMarker {
	readonly x: number
	readonly label: string
	/** True when the label is an id no `traj` Read names, which the chart sets in code. */
	readonly code?: boolean
}

/** The markers that fall inside a column, in pixels. A marker beyond every column is not drawn. */
export function markersIn(
	markers: readonly LineMarker[],
	xs: readonly number[],
	xPixels: readonly number[],
	slot: number,
): PlacedMarker[] {
	return markers.flatMap((marker) => {
		const column = xs.findIndex((x) => marker.x > x - 1 && marker.x <= x)
		const centre = xPixels[column]
		const x = xs[column]
		if (centre === undefined || x === undefined) return []
		return [
			{
				x: centre - slot / 2 + (marker.x - (x - 1)) * slot,
				label: marker.label,
				...(marker.code === true ? { code: true } : {}),
			},
		]
	})
}
