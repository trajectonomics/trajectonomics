import type { Margin } from "../../lib/chart"

/** The height of a line chart, in pixels. Its width follows the column it sits in. */
export const HEIGHT = 240

/** The room around the plot for the axis labels, in pixels. */
export const MARGIN: Margin = { top: 12, right: 16, bottom: 28, left: 64 }

/** The narrowest a chart is drawn, so its axis labels never collide. */
export const MIN_WIDTH = 240

/** The room on the right for the labels of a second axis, in pixels. */
export const RIGHT_AXIS_MARGIN = 48

/** The room a second line of x labels (the ages) takes under the dates, in pixels. */
export const SUB_LINE = 14

/** The width before the chart is measured, which is also what a prerender would show. */
export const FALLBACK_WIDTH = 640
