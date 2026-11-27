import { copyFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

/** The brand folder the blog reads, which `BRAND` picks when the brand package builds. */
const BRAND = "@trajectonomics/brand/current"

/** The faces the blog draws with: the display pair and the mono, latin subsets only. */
export const BRAND_FACES = Object.freeze([
	"aleo-latin-300.woff2",
	"aleo-latin-400.woff2",
	"azeret-mono-latin-500.woff2",
] as const)

/** The Favicon Set the blog's head links. */
export const FAVICON_SET = Object.freeze([
	"favicon.svg",
	"favicon.ico",
	"apple-touch-icon.png",
] as const)

/** The brand files the blog serves, as `[folder in the brand, file]`. */
export const BRAND_ASSETS: readonly (readonly [string, string])[] = Object.freeze([
	...BRAND_FACES.map((face) => ["fonts", face] as const),
	...FAVICON_SET.map((icon) => ["favicon", icon] as const),
])

/** Where the brand package keeps one file, found through its own exports; a missing file stops the build. */
export function brandFile(folder: string, file: string): string {
	try {
		return Bun.resolveSync(`${BRAND}/${folder}/${file}`, import.meta.dir)
	} catch {
		throw new Error(
			`copy-brand-assets: ${folder}/${file} is missing from ${BRAND}. Build the brand first.`,
		)
	}
}

/**
 * Copies the brand's fonts and Favicon Set into `public/`, so the build serves them under the blog's
 * base. A missing file stops the build rather than shipping a page that asks for a file it cannot serve.
 */
export async function copyBrandAssets(publicRoot: string): Promise<number> {
	for (const [folder, file] of BRAND_ASSETS) {
		const from = brandFile(folder, file)
		await mkdir(join(publicRoot, folder), { recursive: true })
		await copyFile(from, join(publicRoot, folder, file))
	}
	return BRAND_ASSETS.length
}

if (import.meta.main) {
	const publicRoot = fileURLToPath(new URL("../public", import.meta.url))
	const copied = await copyBrandAssets(publicRoot)
	console.log(`copy-brand-assets: ${copied} files in ${publicRoot}`)
}
