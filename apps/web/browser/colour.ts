import type { Page } from "@playwright/test"

/** A colour as red, green and blue, each 0 to 255. */
export type Rgb = readonly [number, number, number]

/** A piece of text on paper: what it says, its colour and the opaque colour behind it, as sRGB. */
export interface Ink {
	readonly label: string
	readonly text: Rgb
	readonly behind: Rgb
}

/**
 * Every visible piece of text with its own colour and the first opaque background behind it (white when
 * there is none). The browser paints each CSS colour on one pixel and reads it back, because Tailwind
 * writes `oklab()` and a script cannot parse that.
 */
export function readInk(page: Page): Promise<Ink[]> {
	return page.evaluate(() => {
		const canvas = document.createElement("canvas")
		canvas.width = 1
		canvas.height = 1
		const context = canvas.getContext("2d", { willReadFrequently: true })
		if (context === null) throw new Error("A canvas is needed to read colours.")
		const paint = (css: string) => {
			context.clearRect(0, 0, 1, 1)
			context.fillStyle = css
			context.fillRect(0, 0, 1, 1)
			const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data
			return { rgb: [r, g, b] as const, opaque: a > 127 }
		}
		const behind = (element: Element) => {
			for (let box: Element | null = element; box !== null; box = box.parentElement) {
				const colour = paint(getComputedStyle(box).backgroundColor)
				if (colour.opaque) return colour.rgb
			}
			return [255, 255, 255] as const
		}
		const hasText = (element: Element) =>
			[...element.childNodes].some(
				(node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
			)
		const shown = (element: Element) => {
			const { display, visibility } = getComputedStyle(element)
			return display !== "none" && visibility !== "hidden"
		}
		return [...document.querySelectorAll("body *")]
			.filter((element) => !(element instanceof SVGElement) && shown(element) && hasText(element))
			.map((element) => ({
				label: `${element.tagName} "${(element.textContent ?? "").trim().slice(0, 30)}"`,
				text: paint(getComputedStyle(element).color).rgb,
				behind: behind(element),
			}))
	})
}

function luminance([r, g, b]: Rgb): number {
	const part = (value: number) => {
		const unit = value / 255
		return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
	}
	return 0.2126 * part(r) + 0.7152 * part(g) + 0.0722 * part(b)
}

/** WCAG's contrast ratio of two colours, from 1 (the same) to 21 (black on white). */
export function contrast(a: Rgb, b: Rgb): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
	return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}
