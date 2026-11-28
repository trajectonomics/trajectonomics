import { describe, expect, it } from "bun:test"
import type { Dictionary } from "../language/dictionary"
import { dictionaryFor } from "../language/languages"
import { CHART_RIGHT, QUESTION_BASELINE, QUESTION_SIZE } from "./chart-layout"
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

/** A one-pixel PNG: the home card's composition only places the mascot, it never decodes it. */
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
			mascot: MASCOT,
		}).svg
		expect(svg).toContain("a &amp; b &lt; c &gt; d &quot; e &apos; f")
		expect(svg).toContain("&lt;free&gt;")
		expect(svg).not.toContain("<free>")
	})
})
