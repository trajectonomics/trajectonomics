import { type FocusChartGeometry, focusChart } from "./focus-chart"
import type { ChartRow } from "./focus-chart-axis"
import {
	type BoxPlacement,
	bandHeight,
	FLAG_YEAR,
	type LabelBox,
	type LabelPlacement,
	type LabelSide,
	placeBox,
	placeLabel,
} from "./focus-label-layout"

/** Everything the focus chart draws: the geometry, the answer's box and the flag year's box. */
export interface FocusLayout {
	readonly chart: FocusChartGeometry
	readonly label: LabelPlacement
	/** The flag year's top-left, or null when the chart has no flag. */
	readonly flag: { readonly x: number; readonly y: number } | null
	/** The SVG's height: the plot's height plus any band reserved above it. */
	readonly height: number
}

/**
 * The chart and the boxes written on it. A box that clears the line nowhere inside the plot reserves
 * a band above it: the plot moves down by the band's height, and the box sits in the band, so the line
 * never crosses it.
 */
export function focusLayout(
	rows: readonly ChartRow[],
	stopDate: string | null,
	endDate: string | null,
	width: number,
	height: number,
	box: LabelBox,
	withFlag: boolean,
): FocusLayout {
	const base = focusChart(rows, stopDate, endDate, width, height)
	const baseAnchor = anchorOf(base)
	const baseLabel = placeLabel(base.points, base.plot, baseAnchor, box, baseAnchor.side)
	const baseFlag = withFlag ? flagAt(base) : null
	const band = baseLabel.band || baseFlag?.band === true ? bandHeight(box) : 0
	if (band === 0) return { chart: base, label: baseLabel, flag: boxOf(baseFlag), height }
	const chart = focusChart(rows, stopDate, endDate, width, height + band, band)
	const anchor = anchorOf(chart)
	return {
		chart,
		label: baseLabel.band
			? baseLabel
			: placeLabel(chart.points, chart.plot, anchor, box, anchor.side),
		flag: withFlag ? (baseFlag?.band === true ? boxOf(baseFlag) : boxOf(flagAt(chart))) : null,
		height: height + band,
	}
}

/** The answer's point and side, or the plot's centre when the chart has no point to write beside. */
function anchorOf(chart: FocusChartGeometry): { x: number; y: number; side: LabelSide } {
	return (
		chart.label ?? {
			x: (chart.plot.left + chart.plot.right) / 2,
			y: (chart.plot.top + chart.plot.bottom) / 2,
			side: "center",
		}
	)
}

/** The flag year's box at the chart's last point. */
function flagAt(chart: FocusChartGeometry): BoxPlacement | null {
	if (chart.flag === null) return null
	return placeBox(chart.points, chart.plot, chart.flag.x - 6 - FLAG_YEAR.width, FLAG_YEAR)
}

/** A placement's top-left, without the band flag. */
function boxOf(placement: BoxPlacement | null): { x: number; y: number } | null {
	return placement === null ? null : { x: placement.x, y: placement.y }
}
