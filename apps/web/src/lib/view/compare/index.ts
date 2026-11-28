/** The Compare page's view model: pure functions from a comparison to its figures, sides and chart. */
export { type Cell, NO_CHANGE, NO_DELTA, type Value } from "./cell"
export {
	type ChartSide,
	type ChartState,
	type CompareChartPoint,
	type CompareChartSeries,
	chartSides,
	comparisonChart,
	parseTerms,
	type Terms,
} from "./chart"
export { type FigureRow, figureRows } from "./figure-rows"
export { type CompareFocus, type CompareWinner, compareFocusView } from "./focus"
export { type CompareSideHeading, compareSides } from "./sides"
