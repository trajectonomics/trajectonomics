/** Pure chart functions: scales, ticks, paths, shares, layout and hover. No DOM, no chart library. */
export { type Extent, extent } from "./extent"
export { keyTarget } from "./hover"
export type { LinePoint, LineSeries } from "./line"
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
export { areaPath, linePath, type PathPoint } from "./path"
export { linearScale, type Range } from "./scale"
export { shares } from "./shares"
export { sparklinePath } from "./sparkline"
export { niceTicks } from "./ticks"
