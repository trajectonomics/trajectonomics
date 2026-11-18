import { describe, expect, it } from "bun:test"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { RenderedImage } from "@resvg/resvg-js"
import { pngPixels } from "../src/lib/build/image-pixels"
import { dictionaryFor, LANGUAGES } from "../src/lib/language/languages"
import {
	MARGIN,
	META_BASELINE,
	SHARE_IMAGE_HEIGHT,
	SHARE_IMAGE_WIDTH,
} from "../src/lib/social/layout"
import { shareColours } from "../src/lib/social/share-colours"
import { SHARE_IMAGE_MAX_BYTES, shareImage } from "../src/lib/social/share-image"
import { readDesignTokens } from "./adapters/design-tokens"
import { shareImageFonts } from "./adapters/share-fonts"
import { readShareLockup } from "./adapters/share-lockup"
import { renderShareImage, renderShareImagePixels, writeShareImages } from "./share-image"

/** The card every share image must be cut at, which the checks hold it to. */
const CARD = Object.freeze({ width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT })

/** The one Language whose composition the render is judged on. */
const LANGUAGE = LANGUAGES[0]?.language ?? "en"

/** One composed image, from the pinned Theme and the shipped lockup, as the prebuild step builds it. */
async function composedImage(language: string = LANGUAGE) {
	return shareImage({
		language,
		dictionary: dictionaryFor(language),
		colours: shareColours(await readDesignTokens()),
		lockup: await readShareLockup(),
	})
}

/**
 * The leftmost and rightmost columns the ink below the meta line covers, or none when nothing is drawn.
 * A pixel counts once it is more than half ink, so a glyph's antialiased fringe is not a margin breach.
 */
function inkExtent(
	rendered: RenderedImage,
): { readonly left: number; readonly right: number } | undefined {
	const pixels = rendered.pixels
	let left = rendered.width
	let right = -1
	for (let y = META_BASELINE + 14; y < rendered.height; y += 1) {
		for (let x = 0; x < rendered.width; x += 1) {
			if ((pixels[(y * rendered.width + x) * 4] ?? 0) < 128) continue
			left = Math.min(left, x)
			right = Math.max(right, x)
		}
	}
	return right < 0 ? undefined : { left, right }
}

describe("the fonts a share image is rasterized through", () => {
	it("gives the rasterizer the three Brand Typeface cuts as sfnt and the Thai face", async () => {
		const fonts = await shareImageFonts()
		expect(fonts).toHaveLength(4)
		for (const path of fonts) expect(Bun.file(path).size).toBeGreaterThan(0)
	})
})

describe("the PNG a share image rasterizes to", () => {
	it("is the card's own size and light enough for a crawler to fetch", async () => {
		const png = renderShareImage(await composedImage(), await shareImageFonts())
		expect(pngPixels(png)).toEqual(CARD)
		expect(png.length).toBeLessThan(SHARE_IMAGE_MAX_BYTES)
	})

	it("draws the statement and the meta in the Site's own faces, not only in the Thai fallback", async () => {
		const image = await composedImage("en")
		const fonts = await shareImageFonts()
		const thai = fonts.filter((path) => path.endsWith("NotoSansThai.ttf"))
		expect(renderShareImage(image, fonts)).not.toEqual(renderShareImage(image, thai))
	})

	it("keeps every pixel of the statement inside the image's margins", async () => {
		const rendered = renderShareImagePixels(await composedImage(), await shareImageFonts())
		const ink = inkExtent(rendered)
		expect(ink).toBeDefined()
		expect(ink?.left).toBeGreaterThanOrEqual(MARGIN)
		expect(ink?.right).toBeLessThanOrEqual(SHARE_IMAGE_WIDTH - MARGIN)
	})

	it("prints the same bytes twice, so a rebuild does not touch the file", async () => {
		const fonts = await shareImageFonts()
		const image = await composedImage()
		expect(renderShareImage(image, fonts)).toEqual(renderShareImage(image, fonts))
	})

	it("draws the two Languages as two different pictures", async () => {
		const fonts = await shareImageFonts()
		const thai = renderShareImage(await composedImage("th"), fonts)
		const english = renderShareImage(await composedImage("en"), fonts)
		expect(pngPixels(thai)).toEqual(CARD)
		expect(pngPixels(english)).toEqual(CARD)
		expect(thai).not.toEqual(english)
	})
})

describe("the share images the prebuild step writes", () => {
	it("writes one PNG per Language, at the card's size, into the static directory", async () => {
		const destination = await mkdtemp(join(tmpdir(), "share-image-"))
		try {
			const languages = await writeShareImages(destination)
			expect(languages).toEqual(LANGUAGES.map((entry) => entry.language))
			for (const language of languages) {
				const png = await Bun.file(join(destination, `${language}.png`)).bytes()
				expect(pngPixels(png)).toEqual(CARD)
			}
		} finally {
			await rm(destination, { recursive: true, force: true })
		}
	})
})
