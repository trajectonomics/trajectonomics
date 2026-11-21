import type { Page } from "@playwright/test"
import { type CopyLine, heroGround } from "./copy-lines"

/** How much of the copy's line boxes the rim paints over, and the worst pixel it finds there. */
export interface RimOverlap {
	readonly painted: number
	readonly samples: number
	readonly worst: number
	readonly text: string
}

/** The most a pixel may differ from the hero's ground and still be the ground: PNG rounding, nothing more. */
const GROUND_TOLERANCE = 3

/** One line box shrunk by a pixel, so its own antialiased edge cannot be mistaken for paint. */
function inset(line: CopyLine): CopyLine {
	return {
		text: line.text,
		left: Math.ceil(line.left) + 1,
		top: Math.ceil(line.top) + 1,
		right: Math.floor(line.right) - 1,
		bottom: Math.floor(line.bottom) - 1,
	}
}

/**
 * The pixels of the hero's copy the rim paints over, counted from a screenshot of the hero with only the rim
 * painting in it: the field's squares, the ripple and the copy's own ink are gone, so a pixel inside one of
 * its line boxes can only be the rim's ([ADR 0017](../docs/adr/0017-the-hero-rim-brightens-the-field-outside-the-copy.md)).
 */
export async function rimOverlap(page: Page): Promise<RimOverlap> {
	const scene = await heroGround(page)
	const png = await page.screenshot({ clip: scene.box, fullPage: true })
	const lines = scene.lines.map(inset).filter((line) => line.right > line.left)
	return page.evaluate(
		async ({ data, lines, ground, tolerance, width, height }): Promise<RimOverlap> => {
			const analyse = (bitmap: ImageBitmap): RimOverlap[] => {
				const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d")
				if (context === null) throw new Error("the browser drew no 2d context")
				context.drawImage(bitmap, 0, 0)
				const [red = 0, green = 0, blue = 0] = (ground.match(/[\d.]+/g) ?? []).map(Number)
				return lines.map((line) => {
					const pixels = context.getImageData(
						line.left,
						line.top,
						line.right - line.left,
						line.bottom - line.top,
					).data
					let painted = 0
					let worst = 0
					for (let index = 0; index < pixels.length; index += 4) {
						const delta = Math.max(
							Math.abs((pixels[index] ?? 0) - red),
							Math.abs((pixels[index + 1] ?? 0) - green),
							Math.abs((pixels[index + 2] ?? 0) - blue),
						)
						painted += Number(delta > tolerance)
						worst = Math.max(worst, delta)
					}
					return { painted, samples: pixels.length / 4, worst, text: line.text }
				})
			}
			const blob = await (await fetch(`data:image/png;base64,${data}`)).blob()
			const bitmap = await createImageBitmap(blob)
			if (bitmap.width !== width || bitmap.height !== height) {
				throw new Error(
					`the screenshot is ${bitmap.width}x${bitmap.height}, not ${width}x${height}`,
				)
			}
			return analyse(bitmap).reduce((total, line) => ({
				painted: total.painted + line.painted,
				samples: total.samples + line.samples,
				worst: Math.max(total.worst, line.worst),
				text: line.worst > total.worst ? line.text : total.text,
			}))
		},
		{
			data: png.toString("base64"),
			lines,
			ground: scene.ground,
			tolerance: GROUND_TOLERANCE,
			width: Math.round(scene.box.width),
			height: Math.round(scene.box.height),
		},
	)
}
