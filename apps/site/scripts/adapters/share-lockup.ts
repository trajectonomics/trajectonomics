import { createRequire } from "node:module"
import type { ShareLockup } from "../../src/lib/social/lockup"

/** The assets package that ships the brand lockup. */
const ASSETS_PACKAGE = "@trajectonomics/brand/current"

/** The wordmark's file inside that package: the lockup a share image draws. */
const WORDMARK = "logo/wordmark.svg"

/** The box the wordmark's own `viewBox` states, which the share image scales from. */
const VIEW_BOX = /viewBox="0 0 ([\d.]+) ([\d.]+)"/

/** The markup inside the wordmark's `<svg>`: its paths, without the `<title>`, which draws nothing. */
function markupOf(svg: string): string {
	return svg
		.replace(/^[\s\S]*?<svg[^>]*>/, "")
		.replace(/<\/svg>[\s\S]*$/, "")
		.replace(/<title>[\s\S]*?<\/title>/, "")
		.trim()
}

/** The brand lockup the pinned assets package ships, read from the file its own exports publish. */
export async function readShareLockup(): Promise<ShareLockup> {
	const path = createRequire(import.meta.url).resolve(`${ASSETS_PACKAGE}/${WORDMARK}`)
	const svg = await Bun.file(path).text()
	const box = VIEW_BOX.exec(svg)
	const width = Number(box?.[1])
	const height = Number(box?.[2])
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
		throw new Error(`share-lockup: ${path} states no viewBox a share image can scale from.`)
	}
	return Object.freeze({ width, height, markup: markupOf(svg) })
}
