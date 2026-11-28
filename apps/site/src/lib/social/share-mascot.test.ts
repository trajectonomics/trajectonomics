import { describe, expect, it } from "bun:test"
import { openJotDictionaryFor } from "../language/openjot-dictionary"
import { CHART_BASELINE, CHART_LEFT, CHART_RIGHT } from "./chart-layout"
import { MARGIN, META_BASELINE, SHARE_IMAGE_WIDTH } from "./layout"
import type { ShareLockup } from "./lockup"
import { openJotShareImage } from "./openjot-share-image"
import type { ShareColours } from "./share-colours"
import {
	MASCOT_GAP,
	MASCOT_HEIGHT,
	mascotOnBaseline,
	mascotPlacement,
	type ShareMascot,
} from "./share-mascot"

/** The committed cut-out's own pixel size; the data URI is placed, never decoded. */
const MASCOT: ShareMascot = Object.freeze({
	width: 204,
	height: 273,
	href: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
})

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

describe("the mascot the home card draws", () => {
	it("stands on the zero baseline with its right edge at the margin", () => {
		const placement = mascotPlacement(MASCOT)
		expect(placement.y + placement.height).toBeCloseTo(CHART_BASELINE, 1)
		expect(placement.x + placement.width).toBeCloseTo(SHARE_IMAGE_WIDTH - MARGIN, 1)
	})

	it("keeps 24 px clear of the chart and of the host line above it", () => {
		const placement = mascotPlacement(MASCOT)
		expect(MASCOT_GAP).toBe(24)
		expect(placement.x).toBeGreaterThanOrEqual(CHART_RIGHT + MASCOT_GAP)
		expect(placement.y).toBeGreaterThanOrEqual(META_BASELINE + MASCOT_GAP)
	})

	it("keeps its own aspect and the card's margin box", () => {
		const placement = mascotPlacement(MASCOT)
		expect(placement.height / placement.width).toBeCloseTo(MASCOT.height / MASCOT.width, 2)
		expect(placement.height).toBeLessThanOrEqual(MASCOT_HEIGHT)
		expect(placement.x).toBeGreaterThanOrEqual(MARGIN)
		expect(placement.y).toBeGreaterThanOrEqual(MARGIN)
	})

	it("draws one PNG data URI on a baseline that runs out under its feet", () => {
		const markup = mascotOnBaseline(MASCOT, COLOURS.mutedForeground)
		expect(markup).toMatch(/<image href="data:image\/png;base64,[A-Za-z0-9+/]+={0,2}"/)
		expect(markup).toContain(
			`<line x1="${CHART_LEFT}" y1="${CHART_BASELINE}" x2="${SHARE_IMAGE_WIDTH - MARGIN}"`,
		)
	})
})

describe("the OpenJot card", () => {
	it("keeps the mascot off, so its own composition is unchanged", () => {
		const image = openJotShareImage({
			language: "en",
			dictionary: openJotDictionaryFor("en"),
			colours: COLOURS,
			lockup: LOCKUP,
		})
		expect(image.svg).not.toContain("<image")
	})
})
