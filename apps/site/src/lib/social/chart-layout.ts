import { FI_DEMO_AS_OF, FI_DEMO_DATE, FI_DEMO_HORIZON } from "../site"
import { MARGIN } from "./layout"
import { dateFraction } from "./share-date"

/** The x the chart's time axis starts at: the margin every block keeps. */
export const CHART_LEFT = MARGIN

/** The x the axis ends at: short of the margin, so the mascot stands in the space it frees. */
export const CHART_RIGHT = 900

/** The y the tallest part of the curve may reach, in pixels. */
export const CHART_TOP = 270

/** The y of zero net worth: the baseline the curve starts on. */
export const CHART_BASELINE = 500

/** The height the curve's fractions are measured against, in pixels. */
export const CHART_HEIGHT = CHART_BASELINE - CHART_TOP

/** The baseline the question above the chart sits on, in pixels. */
export const QUESTION_BASELINE = 214

/** The type size of that question, in pixels. */
export const QUESTION_SIZE = 44

/** The baseline the two year labels under the chart sit on, in pixels. */
export const AXIS_BASELINE = 536

/** The type size of those year labels, in pixels. */
export const AXIS_SIZE = 18

/** The demo's as-of date, which the time axis starts at. */
export const CHART_START_DATE = FI_DEMO_AS_OF

/** The demo's horizon, which the time axis ends at. */
export const CHART_END_DATE = FI_DEMO_HORIZON

/** The year the axis starts at, as its label writes it. */
export const CHART_START_YEAR = CHART_START_DATE.slice(0, 4)

/** The year the axis ends at, as its label writes it. */
export const CHART_END_YEAR = CHART_END_DATE.slice(0, 4)

/** The thickness of the zero baseline, in pixels. */
export const BASELINE_WIDTH = 2

/** The thickness of the net-worth curve, in pixels. */
export const CURVE_WIDTH = 6

/** The evenly spaced points the curve is sampled through, the two ends included; the knee is added. */
export const CURVE_SAMPLES = 96

/** The radius of the knee marker's filled dot, in pixels. */
export const KNEE_RADIUS = 11

/** The thickness of the background ring around that dot, in pixels. */
export const KNEE_RING_WIDTH = 4

/** The clear space between the knee and the words beside it, in pixels. */
export const KNEE_TEXT_GAP = 22

/** The date's baseline above the knee: above the grey curve, where no glyph touches it. */
export const KNEE_DATE_ABOVE = 56

/** The label's baseline above the knee, under the date. */
export const KNEE_LABEL_ABOVE = 24

/** The type size of the date written on the curve, in pixels. */
export const DATE_SIZE = 40

/** The type size of the label under that date, in pixels. */
export const LABEL_SIZE = 22

/** The opacity of the soft fill under the free part of the curve. */
export const AREA_OPACITY = 0.12

/** The height the curve starts at, as a fraction of the chart. */
const START_HEIGHT = 0.08

/** The height the working years add by the FI date. */
const WORKING_RISE = 0.62

/** The height the free years add by the horizon. */
const FREE_RISE = 0.25

/** How sharply the working years' curve bends upward. */
const WORKING_RATE = 3

/** How quickly the free years' curve levels off. */
const FREE_RATE = 4

/** The share of the time axis the demo's FI date sits at: where the working line becomes free. */
export const KNEE_FRACTION = dateFraction(FI_DEMO_DATE, CHART_START_DATE, CHART_END_DATE)

/**
 * The net-worth line's height at `u` of the time axis, as a fraction of the chart: illustrative, no
 * figures shown. It bends up through the working years and levels off once the person is free to
 * stop, so the two halves meet with no step at the FI date.
 */
export function netWorthShape(u: number): number {
	if (u <= KNEE_FRACTION) {
		const rise = Math.expm1(WORKING_RATE * u) / Math.expm1(WORKING_RATE * KNEE_FRACTION)
		return START_HEIGHT + WORKING_RISE * rise
	}
	const fall = Math.expm1(-FREE_RATE * (u - KNEE_FRACTION))
	const span = Math.expm1(-FREE_RATE * (1 - KNEE_FRACTION))
	return START_HEIGHT + WORKING_RISE + FREE_RISE * (fall / span)
}
