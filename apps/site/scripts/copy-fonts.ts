import { copyFile, mkdir } from "node:fs/promises"
import { createRequire } from "node:module"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

/** The assets package that ships the Brand Typeface. */
const ASSETS_PACKAGE = "@trajectonomics/design-system-assets"

/** The faces the Site draws with: the display pair and the mono, latin subsets only. */
export const BRAND_FACES = [
	"aleo-latin-300.woff2",
	"aleo-latin-400.woff2",
	"azeret-mono-latin-500.woff2",
] as const

/** The resolver the prebuild step runs under. */
const resolve = createRequire(import.meta.url).resolve

/** Where the published package keeps the Brand Typeface, found through its own exports. */
export function brandFontsSource(): string {
	return dirname(resolve(`${ASSETS_PACKAGE}/fonts/${BRAND_FACES[0]}`))
}

/**
 * Copies the three Brand Typeface files from the pinned assets package into the Site's static
 * directory, so every build serves them from `/fonts/`. A missing source file stops the build
 * rather than shipping a stylesheet that asks for a font the Worker cannot answer.
 */
export async function copyBrandFonts(
	destination: string,
	source: string = brandFontsSource(),
): Promise<readonly string[]> {
	await mkdir(destination, { recursive: true })
	for (const face of BRAND_FACES) {
		const from = join(source, face)
		const file = Bun.file(from)
		if (!(await file.exists())) {
			throw new Error(
				`copy-fonts: the Brand Typeface file ${basename(from)} is missing from ${source}. Run \`bun install\` and check that ${ASSETS_PACKAGE} ships it.`,
			)
		}
		await copyFile(from, join(destination, face))
		const copied = Bun.file(join(destination, face))
		if (!(await copied.exists()) || copied.size !== file.size) {
			throw new Error(`copy-fonts: ${join(destination, face)} was not copied in full.`)
		}
	}
	return BRAND_FACES
}

if (import.meta.main) {
	const destination = fileURLToPath(new URL("../public/fonts", import.meta.url))
	const faces = await copyBrandFonts(destination)
	console.log(`copy-fonts: ${faces.length} faces in ${destination}`)
}
