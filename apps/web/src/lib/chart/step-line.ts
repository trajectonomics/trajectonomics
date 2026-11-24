import { extent } from "./extent"
import type { LineSeries } from "./line"
import type { LineLayout, Mark, Plot, SeriesLayout } from "./line-layout"
import { linePath, type PathPoint } from "./path"
import { linearScale } from "./scale"
import { niceTicks } from "./ticks"

/** A series drawn as a step line on a second axis: its points, and how a value on that axis reads. */
export interface StepLine {
	readonly line: LineSeries
	/** The label of a tick of the second axis, such as "20%". Called only for a whole number of the series' units. */
	readonly label: (value: number) => string
}

/**
 * Adds a step line to a column chart's layout, on its own axis on the right that starts at zero. The line
 * holds each column's value across the column's width and steps at its edges. Its y positions are for
 * drawing only: a tooltip row is the point's own string. `xs` are the chart's columns, as `columnXs` names them.
 */
export function withStepLine(
	layout: LineLayout,
	step: StepLine,
	xs: readonly number[],
	plot: Plot,
): LineLayout {
	const { margin } = plot
	const plotWidth = plot.width - margin.left - margin.right
	const half = plotWidth / xs.length / 2
	const ticks = niceTicks(
		extent([0, ...step.line.points.map((point) => point.y)]) ?? { min: 0, max: 0 },
	)
	const scaleY = linearScale(
		{ min: ticks[0] ?? 0, max: ticks[ticks.length - 1] ?? 0 },
		{ from: plot.height - margin.bottom, to: margin.top },
	)
	const marks = xs.map((x, column): Mark | null => {
		const point = step.line.points.find((candidate) => candidate.x === x)
		const centre = layout.xPixels[column]
		return point && centre !== undefined
			? { x: centre, y: scaleY(point.y), display: point.display }
			: null
	})
	const path: PathPoint[] = []
	for (const mark of marks) {
		if (!mark) continue
		const previous = path[path.length - 1]
		if (previous) path.push({ x: mark.x - half, y: previous.y })
		path.push({ x: mark.x - half, y: mark.y }, { x: mark.x + half, y: mark.y })
	}
	const drawn: SeriesLayout = {
		name: step.line.name,
		dashed: step.line.dashed ?? false,
		dotted: step.line.dotted ?? false,
		path: linePath(path),
		marks,
		plain: true,
	}
	return {
		...layout,
		series: [...layout.series, drawn],
		rightAxis: {
			edge: plot.width - margin.right,
			ticks: ticks
				.filter((value) => Number.isInteger(value))
				.map((value) => ({ label: step.label(value), y: scaleY(value) })),
		},
	}
}
