import { pngPixels } from "../../src/lib/build/image-pixels"
import type { ShareMascot } from "../../src/lib/social/share-mascot"

/** The committed cut-out the home card draws: a green-screen render, keyed offline (ADR 0026). */
const MASCOT = new URL("../../src/lib/social/assets/mascot-point.png", import.meta.url)

/**
 * The mascot the home card draws: its PNG read as one base64 data URI, so the composer stays pure and
 * the rasterizer embeds the picture rather than fetching a file the card would have to carry.
 */
export async function readShareMascot(): Promise<ShareMascot> {
	const bytes = new Uint8Array(await Bun.file(MASCOT).arrayBuffer())
	const size = pngPixels(bytes)
	if (size === undefined) {
		throw new Error(`share-mascot: ${MASCOT.pathname} is not a PNG with a pixel size.`)
	}
	const href = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`
	return Object.freeze({ width: size.width, height: size.height, href })
}
