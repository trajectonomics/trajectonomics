import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { MOVED_POSTS, movedPostRedirects, redirectsFile } from "../src/lib/moved-posts"

/**
 * Writes `public/_redirects` from `MOVED_POSTS`, so Astro copies it to `dist/_redirects` and
 * Workers Static Assets answers every moved Post's old address with a permanent redirect.
 */
export async function writeRedirects(publicRoot: string): Promise<number> {
	const redirects = movedPostRedirects(MOVED_POSTS)
	await mkdir(publicRoot, { recursive: true })
	await writeFile(join(publicRoot, "_redirects"), redirectsFile(redirects), "utf8")
	return redirects.length
}

if (import.meta.main) {
	const publicRoot = fileURLToPath(new URL("../public", import.meta.url))
	const count = await writeRedirects(publicRoot)
	console.log(`write-redirects: ${count} rules in ${publicRoot}/_redirects`)
}
