/** The Compare page's view model: pure functions from a comparison to its figures, sides and chart. */
export { type Cell, NO_CHANGE, NO_DELTA, type Value } from "./cell"
export {
	type ChartSide,
	type ChartState,
	chartSides,
	comparisonChart,
	parseTerms,
	type Terms,
} from "./chart"
export { type FigureRow, figureRows } from "./figure-rows"
export { type CompareSideHeading, compareSides } from "./sides"
