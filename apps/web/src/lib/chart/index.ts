/** Pure chart functions: scales, ticks, paths, shares, layout and hover. No DOM, no chart library. */

export { barHeights } from "./bars"
export { type DaySpan, dayPosition } from "./date-position"
export { type Extent, extent } from "./extent"
export { FAN_LEVELS, type Fan, fanOf, fanSeriesName } from "./fan"
export { keyTarget } from "./hover"
export type { LineMarker, LinePoint, LineSeries } from "./line"
export {
	type LineLayout,
	lineLayout,
	type Margin,
	type Mark,
	type Plot,
	type SeriesLayout,
} from "./line-layout"
export { nearestIndex } from "./nearest"
export { toChartNumber } from "./number"
export { areaPath, bandPath, linePath, type PathPoint } from "./path"
export { linearScale, type Range } from "./scale"
export { shares } from "./shares"
export { sparklinePath } from "./sparkline"
export { niceTicks } from "./ticks"
