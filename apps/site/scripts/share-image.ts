import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import { LANGUAGES } from "../src/lib/language/languages"
import { shareColours } from "../src/lib/social/share-colours"
import { type ShareImage, shareImage } from "../src/lib/social/share-image"
import { readDesignTokens } from "./adapters/design-tokens"
import { shareImageFonts } from "./adapters/share-fonts"
import { readShareLockup } from "./adapters/share-lockup"

/** The PNG one composed share image rasterizes to, with its own fonts and no system font consulted. */
export function renderShareImage(image: ShareImage, fonts: readonly string[]): Uint8Array {
	const resvg = new Resvg(image.svg, {
		font: { fontFiles: [...fonts], loadSystemFonts: false, defaultFontFamily: "Aleo" },
	})
	return resvg.render().asPng()
}

/** The same render as the rasterizer's own pixels, so a test can judge the ink it laid down. */
export function renderShareImagePixels(image: ShareImage, fonts: readonly string[]) {
	const resvg = new Resvg(image.svg, {
		font: { fontFiles: [...fonts], loadSystemFonts: false, defaultFontFamily: "Aleo" },
	})
	return resvg.render()
}

/**
 * Writes one share image per Language into the Site's static directory, and returns the language codes
 * it wrote: the words come from the Dictionaries, the colours from the pinned Theme, the lockup from the
 * assets package, so no part of the picture is written twice.
 */
export async function writeShareImages(destination: string): Promise<readonly string[]> {
	const colours = shareColours(await readDesignTokens())
	const lockup = await readShareLockup()
	const fonts = await shareImageFonts()
	await mkdir(destination, { recursive: true })
	for (const entry of LANGUAGES) {
		const image = shareImage({
			language: entry.language,
			dictionary: entry.dictionary,
			colours,
			lockup,
		})
		const png = renderShareImage(image, fonts)
		const path = join(destination, `${entry.language}.png`)
		await writeFile(path, png)
		const written = Bun.file(path)
		if (!(await written.exists()) || written.size !== png.length) {
			throw new Error(`share-image: ${path} was not written in full.`)
		}
	}
	return Object.freeze(LANGUAGES.map((entry) => entry.language))
}

if (import.meta.main) {
	const destination = fileURLToPath(new URL("../public/og", import.meta.url))
	const languages = await writeShareImages(destination)
	console.log(`share-image: ${languages.join(", ")} in ${destination}`)
}
