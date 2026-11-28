import { describe, expect, it } from "bun:test"
import type { Dictionary } from "../language/dictionary"
import { dictionaryFor } from "../language/languages"
import { FI_DEMO_DATE } from "../site"
import {
	AREA_OPACITY,
	AXIS_BASELINE,
	AXIS_SIZE,
	BASELINE_WIDTH,
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
	QUESTION_BASELINE,
	QUESTION_SIZE,
} from "./chart-layout"
import {
	LOCKUP_HEIGHT,
	MARGIN,
	META_BASELINE,
	META_SIZE,
	SHARE_IMAGE_HEIGHT,
	SHARE_IMAGE_WIDTH,
} from "./layout"
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

/** One Language's image, composed from the Theme's colours and the shipped lockup. */
function imageOf(language: string): ShareImage {
	const input: ShareImageInput = {
		language,
		dictionary: dictionaryFor(language),
		colours: COLOURS,
		lockup: LOCKUP,
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

describe("one Language's home share image", () => {
	it("is cut at the size every share sheet reads a large card at", () => {
		const image = imageOf("en")
		expect(image.width).toBe(SHARE_IMAGE_WIDTH)
		expect(image.height).toBe(SHARE_IMAGE_HEIGHT)
		expect(image.svg).toContain(`viewBox="0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}"`)
	})

	it("paints the Theme's own background, ink, muted meta and accent, and no other colour", () => {
		const painted = imageOf("en").svg.match(/#[0-9a-f]{6}/gi)
		expect(new Set(painted)).toEqual(new Set(Object.values(COLOURS)))
	})

	it("asks the Language's own question, at the headline's size and in its script's face", () => {
		const english = dictionaryFor("en")
		expect(imageOf("en").svg).toContain(
			`<text x="${MARGIN}" y="${QUESTION_BASELINE}" font-family="Aleo" font-size="${QUESTION_SIZE}" fill="${COLOURS.foreground}">${escapeXml(english.actionQuestion)}</text>`,
		)
		const thai = dictionaryFor("th")
		expect(imageOf("th").svg).toContain(
			`<text x="${MARGIN}" y="${QUESTION_BASELINE}" font-family="Noto Sans Thai" font-size="${QUESTION_SIZE}" fill="${COLOURS.foreground}">${escapeXml(drawableThai(thai.actionQuestion))}</text>`,
		)
	})

	it("draws the brand lockup, scaled to the height the image allows", () => {
		const { svg } = imageOf("en")
		expect(svg).toContain(LOCKUP.markup)
		expect(svg).toContain(`scale(${Number((LOCKUP_HEIGHT / LOCKUP.height).toFixed(4))})`)
		expect(svg).toContain('color="#fafafa"')
	})

	it("names the host in the corner, and no longer the Language", () => {
		expect(imageOf("en").svg).toContain(
			`<text x="${CHART_RIGHT}" y="${META_BASELINE}" text-anchor="end" font-family="Azeret Mono" font-size="${META_SIZE}" fill="${COLOURS.mutedForeground}">trajectonomics.com</text>`,
		)
		for (const language of ["en", "th"]) {
			expect(imageOf(language).svg).not.toContain(`>${dictionaryFor(language).languageName}<`)
		}
	})

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
			`<line x1="${CHART_LEFT}" y1="500" x2="${CHART_RIGHT}" y2="500" stroke="${COLOURS.mutedForeground}" stroke-width="${BASELINE_WIDTH}"/>`,
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

	it("keeps every coordinate inside the 72-pixel margin box", () => {
		const { svg } = imageOf("en")
		for (const [, value] of svg.matchAll(/\b(?:x|cx|x1|x2)="(-?[\d.]+)"/g)) {
			expect(Number(value)).toBeGreaterThanOrEqual(MARGIN)
			expect(Number(value)).toBeLessThanOrEqual(SHARE_IMAGE_WIDTH - MARGIN)
		}
		for (const [, value] of svg.matchAll(/\b(?:y|cy|y1|y2)="(-?[\d.]+)"/g)) {
			expect(Number(value)).toBeGreaterThanOrEqual(MARGIN)
			expect(Number(value)).toBeLessThanOrEqual(SHARE_IMAGE_HEIGHT - MARGIN)
		}
		for (const [, data] of svg.matchAll(/<path d="([^"]*)"[^>]*(?:fill="none"|fill-opacity=)/g)) {
			const points = (data ?? "").replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number)
			for (let index = 0; index + 1 < points.length; index += 2) {
				expect(points[index]).toBeGreaterThanOrEqual(MARGIN)
				expect(points[index]).toBeLessThanOrEqual(SHARE_IMAGE_WIDTH - MARGIN)
				expect(points[index + 1]).toBeGreaterThanOrEqual(MARGIN)
				expect(points[index + 1]).toBeLessThanOrEqual(SHARE_IMAGE_HEIGHT - MARGIN)
			}
		}
	})

	it("escapes every character XML reserves in the question and the label", () => {
		const unsafe: Dictionary = {
			...dictionaryFor("en"),
			actionQuestion: "a & b < c > d \" e ' f",
			shareFreeLabel: "<free>",
		}
		const svg = shareImage({
			language: "en",
			dictionary: unsafe,
			colours: COLOURS,
			lockup: LOCKUP,
		}).svg
		expect(svg).toContain("a &amp; b &lt; c &gt; d &quot; e &apos; f")
		expect(svg).toContain("&lt;free&gt;")
		expect(svg).not.toContain("<free>")
	})
})
