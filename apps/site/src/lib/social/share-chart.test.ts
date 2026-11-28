import { describe, expect, it } from "bun:test"
import { dictionaryFor } from "../language/languages"
import { FI_DEMO_DATE } from "../site"
import {
	AREA_OPACITY,
	AXIS_BASELINE,
	AXIS_SIZE,
	BASELINE_WIDTH,
	CHART_BASELINE,
	CHART_END_DATE,
	CHART_END_YEAR,
	CHART_LEFT,
	CHART_RIGHT,
	CHART_START_DATE,
	CHART_START_YEAR,
	CURVE_WIDTH,
	DATE_SIZE,
	KNEE_DATE_ABOVE,
	KNEE_LABEL_ABOVE,
	KNEE_TEXT_GAP,
	LABEL_SIZE,
} from "./chart-layout"
import { MARGIN, SHARE_IMAGE_WIDTH } from "./layout"
import type { ShareLockup } from "./lockup"
import type { ShareColours } from "./share-colours"
import { dateFraction, shortMonthYear } from "./share-date"
import { type ShareImage, type ShareImageInput, shareImage } from "./share-image"
import { drawableThai, escapeXml } from "./statement"

const COLOURS: ShareColours = Object.freeze({
	background: "#0a0a0a",
	foreground: "#fafafa",
	mutedForeground: "#a1a1a1",
	accent: "#ea580c",
})

const LOCKUP: ShareLockup = Object.freeze({
	width: 676,
	height: 166,
	markup: '<path fill="currentColor" d="M0 0Z"/>',
})

/** A one-pixel PNG: the composition places the mascot and never decodes it. */
const MASCOT = Object.freeze({
	width: 1,
	height: 1,
	href: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
})

/** One Language's image, composed from the Theme's colours and the shipped lockup. */
function imageOf(language: string): ShareImage {
	const input: ShareImageInput = {
		language,
		dictionary: dictionaryFor(language),
		colours: COLOURS,
		lockup: LOCKUP,
		mascot: MASCOT,
	}
	return shareImage(input)
}

/** The number one attribute carries on the first tag whose pattern matches, or NaN. */
function numberIn(svg: string, pattern: RegExp): number {
	return Number(pattern.exec(svg)?.[1])
}

/** The `d` attribute of the one path whose tag carries `marker`, or the empty path when none does. */
function pathOf(svg: string, marker: string): string {
	return new RegExp(`<path d="([^"]*)" ${marker}`).exec(svg)?.[1] ?? ""
}

/** The FI date as one Language writes it. */
function dateOf(language: string): string {
	return shortMonthYear(FI_DEMO_DATE, dictionaryFor(language).shareMonths)
}

describe("the chart a home share image draws", () => {
	it("splits the line at the knee, inside one pixel of the date's share of the axis", () => {
		const { svg } = imageOf("en")
		const cx = numberIn(svg, /<circle cx="([\d.]+)"/)
		const cy = numberIn(svg, /<circle [^>]*cy="([\d.]+)"/)
		const fraction = dateFraction(FI_DEMO_DATE, CHART_START_DATE, CHART_END_DATE)
		const computed = CHART_LEFT + (CHART_RIGHT - CHART_LEFT) * fraction
		expect(Math.abs(cx - computed)).toBeLessThanOrEqual(1)
		const knee = `${cx} ${cy}`
		const working = pathOf(svg, `fill="none" stroke="${COLOURS.mutedForeground}"`)
		const free = pathOf(svg, `fill="none" stroke="${COLOURS.accent}"`)
		const area = pathOf(svg, `fill="${COLOURS.accent}" fill-opacity=`)
		expect(working.startsWith(`M${CHART_LEFT} `) && working.endsWith(`L${knee}`)).toBe(true)
		expect(free.startsWith(`M${knee} `)).toBe(true)
		expect(free).toMatch(new RegExp(`L${CHART_RIGHT} [\\d.]+$`))
		expect(area.startsWith(`M${knee} `)).toBe(true)
		expect(svg).toContain(
			`<line x1="${CHART_LEFT}" y1="${CHART_BASELINE}" x2="${SHARE_IMAGE_WIDTH - MARGIN}" y2="${CHART_BASELINE}" stroke="${COLOURS.mutedForeground}" stroke-width="${BASELINE_WIDTH}"/>`,
		)
		expect(svg.match(new RegExp(`stroke-width="${CURVE_WIDTH}"`, "g"))).toHaveLength(2)
		expect(svg).toContain(`fill="${COLOURS.accent}" fill-opacity="${AREA_OPACITY}"/>`)
		expect(svg).toContain(
			`r="11" fill="${COLOURS.accent}" stroke="${COLOURS.background}" stroke-width="4"`,
		)
	})

	it("writes the localised FI date and its label above and left of the knee", () => {
		const { svg } = imageOf("en")
		const cx = numberIn(svg, /<circle cx="([\d.]+)"/)
		expect(svg).toContain(`>${dateOf("en")}<`)
		expect(svg).toContain(
			`text-anchor="end" font-family="Aleo" font-size="${DATE_SIZE}" fill="${COLOURS.accent}">`,
		)
		expect(svg).toContain(
			`text-anchor="end" font-family="Azeret Mono" font-size="${LABEL_SIZE}" fill="${COLOURS.mutedForeground}">${dictionaryFor("en").shareFreeLabel}</text>`,
		)
		const kneeY = numberIn(svg, /<circle [^>]*cy="([\d.]+)"/)
		const date = new RegExp(
			`<text x="([\\d.]+)" y="([\\d.]+)" text-anchor="end" font-family="Aleo" font-size="${DATE_SIZE}"`,
		)
		const label = new RegExp(
			`<text x="([\\d.]+)" y="([\\d.]+)" text-anchor="end" font-family="Azeret Mono" font-size="${LABEL_SIZE}"`,
		)
		const yOf = (size: number) =>
			numberIn(svg, new RegExp(`<text x="[\\d.]+" y="([\\d.]+)" [^>]*font-size="${size}"`))
		expect(numberIn(svg, date)).toBe(cx - KNEE_TEXT_GAP)
		expect(numberIn(svg, label)).toBe(cx - KNEE_TEXT_GAP)
		expect(kneeY - yOf(DATE_SIZE)).toBe(KNEE_DATE_ABOVE)
		expect(kneeY - yOf(LABEL_SIZE)).toBe(KNEE_LABEL_ABOVE)
		expect(imageOf("th").svg).toContain(`>${dateOf("th")}<`)
		expect(imageOf("th").svg).toContain(
			`>${escapeXml(drawableThai(dictionaryFor("th").shareFreeLabel))}<`,
		)
	})

	it("labels the time axis with the two years the demo runs between", () => {
		const { svg } = imageOf("en")
		expect(svg).toContain(
			`<text x="${CHART_LEFT}" y="${AXIS_BASELINE}" font-family="Azeret Mono" font-size="${AXIS_SIZE}" fill="${COLOURS.mutedForeground}">${CHART_START_YEAR}</text>`,
		)
		expect(svg).toContain(
			`<text x="${CHART_RIGHT}" y="${AXIS_BASELINE}" text-anchor="end" font-family="Azeret Mono" font-size="${AXIS_SIZE}" fill="${COLOURS.mutedForeground}">${CHART_END_YEAR}</text>`,
		)
	})

	it("stands the mascot's data URI on the baseline at the right margin", () => {
		const { svg } = imageOf("en")
		expect(svg).toMatch(/<image href="data:image\/png;base64,[A-Za-z0-9+/]+={0,2}"/)
	})
})
