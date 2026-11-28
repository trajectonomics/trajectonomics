/** Pure chart functions: scales, ticks, paths, shares, layout and hover. No DOM, no chart library. */

export { barHeights } from "./bars"
export { type ColumnKind, columnLayout, columnXs } from "./column-layout"
export { type DaySpan, dayNumber, dayPosition } from "./date-position"
export { type Extent, extent } from "./extent"
export { FAN_LEVELS, type Fan, fanOf, fanSeriesName } from "./fan"
export { type FanLabelEnd, fanLabels } from "./fan-labels"
export { keyTarget } from "./hover"
export {
	LABEL_OFFSET_PX,
	type LabelArea,
	type LabelledMark,
	type PlacedLabel,
	placedLabels,
} from "./label-rows"
export type { LineMarker, LinePoint, LineSeries } from "./line"
export {
	type Bar,
	type LineLayout,
	lineLayout,
	type Margin,
	type Mark,
	type Plot,
	type RightAxis,
	type SeriesLayout,
} from "./line-layout"
export { markersIn, type PlacedMarker } from "./markers"
export { nearestIndex } from "./nearest"
export { toChartNumber } from "./number"
export { areaPath, bandPath, linePath, type PathPoint } from "./path"
export { linearScale, type Range } from "./scale"
export { shares } from "./shares"
export { type Span, stackSpans } from "./stack"
export { type StepLine, withStepLine } from "./step-line"
export { niceTicks } from "./ticks"
