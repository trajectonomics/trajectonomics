import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { decompress } from "wawoff2"
import { BRAND_FACES, brandFontsSource } from "../copy-fonts"

/**
 * The Thai face the repository commits for its visual baselines, which are the one thing in the tree
 * that renders Thai: the Site ships no Thai file, so the Theme names this family and the visitor's own
 * face draws it ([ADR 0005](../../docs/adr/0005-page-weight-and-web-font-budget.md)).
 */
const THAI_FACE = fileURLToPath(new URL("../../e2e/fonts/NotoSansThai.ttf", import.meta.url))

/** Where the converted faces are cached: ignored by git, so no font binary is committed or served. */
const CACHE = fileURLToPath(new URL("../../.scratch/share-fonts", import.meta.url))

/** The sfnt file one `.woff2` face converts to, beside the face it came from. */
function sfntPath(cache: string, face: string): string {
	return join(cache, face.replace(/\.woff2$/, ".ttf"))
}

/**
 * The font files a share image is rasterized through: the Brand Typeface converted from the `.woff2`
 * files the Site ships to the sfnt files the rasterizer reads, then the Thai face. The rasterizer's
 * `fontdb` decodes no `.woff2` and ignores one silently, which would draw the picture in the fallback.
 */
export async function shareImageFonts(cache: string = CACHE): Promise<readonly string[]> {
	await mkdir(cache, { recursive: true })
	const source = brandFontsSource()
	const converted: string[] = []
	for (const face of BRAND_FACES) {
		const sfnt = await decompress(await Bun.file(join(source, face)).bytes())
		const path = sfntPath(cache, face)
		await writeFile(path, sfnt)
		converted.push(path)
	}
	return Object.freeze([...converted, THAI_FACE])
}
