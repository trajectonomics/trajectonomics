import type { Dictionary } from "../language/dictionary"
import { FI_DEMO_DATE } from "../site"
import {
	AREA_OPACITY,
	AXIS_BASELINE,
	AXIS_SIZE,
	BASELINE_WIDTH,
	CHART_BASELINE,
	CHART_END_YEAR,
	CHART_LEFT,
	CHART_RIGHT,
	CHART_START_YEAR,
	DATE_SIZE,
	KNEE_DATE_ABOVE,
	KNEE_FRACTION,
	KNEE_LABEL_ABOVE,
	KNEE_RADIUS,
	KNEE_RING_WIDTH,
	KNEE_TEXT_GAP,
	LABEL_SIZE,
	QUESTION_BASELINE,
	QUESTION_SIZE,
} from "./chart-layout"
import {
	LOCKUP_HEIGHT,
	MARGIN,
	META_BASELINE,
	SHARE_IMAGE_HEIGHT,
	SHARE_IMAGE_WIDTH,
} from "./layout"
import { placedLockup, type ShareLockup } from "./lockup"
import type { ShareColours } from "./share-colours"
import type { ShareImage } from "./share-compose"
import { curveMarkup, curveSegments, pointAt } from "./share-curve"
import { shortMonthYear } from "./share-date"
import { metaText, statementText } from "./share-text"

/** Everything the home card is composed from: the Language's words, the Theme's colours, the lockup. */
export interface ShareChartComposition {
	readonly dictionary: Dictionary
	readonly path: string
	readonly host: string
	readonly colours: ShareColours
	readonly lockup: ShareLockup
}

/** The home card: the question, a net-worth line grey while working and orange once free to stop. */
export function composeShareChart(input: ShareChartComposition): ShareImage {
	const { colours, dictionary } = input
	const knee = pointAt(KNEE_FRACTION)
	const { working, free, area } = curveSegments()
	const date = shortMonthYear(FI_DEMO_DATE, dictionary.shareMonths)
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}">`,
		`<rect width="${SHARE_IMAGE_WIDTH}" height="${SHARE_IMAGE_HEIGHT}" fill="${colours.background}"/>`,
		placedLockup(input.lockup, MARGIN, MARGIN, LOCKUP_HEIGHT, colours.foreground),
		metaText(input.host, CHART_RIGHT, META_BASELINE, colours.mutedForeground, true),
		statementText(
			dictionary.actionQuestion,
			MARGIN,
			QUESTION_BASELINE,
			QUESTION_SIZE,
			colours.foreground,
		),
		`<line x1="${CHART_LEFT}" y1="${CHART_BASELINE}" x2="${CHART_RIGHT}" y2="${CHART_BASELINE}" stroke="${colours.mutedForeground}" stroke-width="${BASELINE_WIDTH}"/>`,
		`<path d="${area}" fill="${colours.accent}" fill-opacity="${AREA_OPACITY}"/>`,
		curveMarkup(working, colours.mutedForeground),
		curveMarkup(free, colours.accent),
		`<circle cx="${knee.x}" cy="${knee.y}" r="${KNEE_RADIUS}" fill="${colours.accent}" stroke="${colours.background}" stroke-width="${KNEE_RING_WIDTH}"/>`,
		statementText(
			date,
			knee.x - KNEE_TEXT_GAP,
			knee.y - KNEE_DATE_ABOVE,
			DATE_SIZE,
			colours.accent,
			' text-anchor="end" font-weight="700"',
		),
		metaText(
			dictionary.shareFreeLabel,
			knee.x - KNEE_TEXT_GAP,
			knee.y - KNEE_LABEL_ABOVE,
			colours.mutedForeground,
			true,
			LABEL_SIZE,
		),
		metaText(
			CHART_START_YEAR,
			CHART_LEFT,
			AXIS_BASELINE,
			colours.mutedForeground,
			false,
			AXIS_SIZE,
		),
		metaText(CHART_END_YEAR, CHART_RIGHT, AXIS_BASELINE, colours.mutedForeground, true, AXIS_SIZE),
		"</svg>",
	].join("\n")
	return Object.freeze({
		path: input.path,
		width: SHARE_IMAGE_WIDTH,
		height: SHARE_IMAGE_HEIGHT,
		svg,
	})
}
