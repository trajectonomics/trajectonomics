import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { Resvg } from "@resvg/resvg-js"
import { LANGUAGES } from "../src/lib/language/languages"
import { OPENJOT_LANGUAGES } from "../src/lib/language/openjot-dictionary"
import { openJotShareImage } from "../src/lib/social/openjot-share-image"
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

/** The image files the prebuild step writes: each page's card for each Language. */
interface ShareImageFile {
	readonly path: string
	readonly image: ShareImage
}

/** Both pages' cards in one Language, composed from the same Theme and the same lockup. */
function imagesOf(
	language: (typeof LANGUAGES)[number],
	openJot: (typeof OPENJOT_LANGUAGES)[number],
	colours: ReturnType<typeof shareColours>,
	lockup: Awaited<ReturnType<typeof readShareLockup>>,
): readonly ShareImageFile[] {
	return [
		{
			path: `${language.language}.png`,
			image: shareImage({
				language: language.language,
				dictionary: language.dictionary,
				colours,
				lockup,
			}),
		},
		{
			path: `openjot-${language.language}.png`,
			image: openJotShareImage({
				language: openJot.language,
				dictionary: openJot.dictionary,
				colours,
				lockup,
			}),
		},
	]
}

/**
 * Writes one share image per page and Language into the Site's static directory, and returns the file
 * names it wrote: the words come from the Dictionaries, the colours from the pinned Theme, the lockup
 * from the assets package, so no part of a picture is written twice.
 */
export async function writeShareImages(destination: string): Promise<readonly string[]> {
	const colours = shareColours(await readDesignTokens())
	const lockup = await readShareLockup()
	const fonts = await shareImageFonts()
	await mkdir(destination, { recursive: true })
	const files = LANGUAGES.flatMap((entry) => {
		const openJot = OPENJOT_LANGUAGES.find((candidate) => candidate.language === entry.language)
		if (openJot === undefined) throw new Error(`no OpenJot card for ${entry.language}`)
		return imagesOf(entry, openJot, colours, lockup)
	})
	for (const { path: name, image } of files) {
		const png = renderShareImage(image, fonts)
		const path = join(destination, name)
		await writeFile(path, png)
		const written = Bun.file(path)
		if (!(await written.exists()) || written.size !== png.length) {
			throw new Error(`share-image: ${path} was not written in full.`)
		}
	}
	return Object.freeze(files.map((file) => file.path))
}

if (import.meta.main) {
	const destination = fileURLToPath(new URL("../public/og", import.meta.url))
	const images = await writeShareImages(destination)
	console.log(`share-image: ${images.join(", ")} in ${destination}`)
}
