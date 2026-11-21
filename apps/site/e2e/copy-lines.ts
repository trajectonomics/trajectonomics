import type { Page } from "@playwright/test"

/** One run of the hero's copy: a text node's line box, in the hero's own pixels. */
export interface CopyLine {
	readonly text: string
	readonly left: number
	readonly top: number
	readonly right: number
	readonly bottom: number
}

/** The hero as the rim paints it: the copy's line boxes, the ground under them, and the hero's box. */
export interface HeroGround {
	readonly lines: readonly CopyLine[]
	readonly ground: string
	readonly box: {
		readonly x: number
		readonly y: number
		readonly width: number
		readonly height: number
	}
}

/**
 * The hero with only the rim painting. The field's squares and the ripple come off the page, and the copy
 * keeps its layout while painting no ink, so a pixel inside one of its line boxes can only be the rim's.
 */
export async function heroGround(page: Page): Promise<HeroGround> {
	return page.evaluate(async () => {
		/** The line boxes one text node wraps onto, in the hero's own pixels. */
		function boxesOf(node: Node, origin: DOMRect): CopyLine[] {
			const text = (node.textContent ?? "").trim().slice(0, 24)
			const range = document.createRange()
			range.selectNodeContents(node)
			const boxes: CopyLine[] = []
			for (const box of range.getClientRects()) {
				if (box.width < 2 || box.height < 2) continue
				boxes.push({
					text,
					left: box.left - origin.left,
					top: box.top - origin.top,
					right: box.right - origin.left,
					bottom: box.bottom - origin.top,
				})
			}
			return boxes
		}
		function lineBoxesOf(copy: Element, origin: DOMRect): CopyLine[] {
			const boxes: CopyLine[] = []
			const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT)
			for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
				if ((node.textContent ?? "").trim().length === 0) continue
				boxes.push(...boxesOf(node, origin))
			}
			return boxes
		}
		const hero = document.querySelector("[data-hero]")
		const copy = hero?.querySelector(".hero-rise")
		if (!(hero instanceof HTMLElement) || !(copy instanceof HTMLElement)) {
			throw new Error("the hero rendered no copy")
		}
		const origin = hero.getBoundingClientRect()
		const style = document.createElement("style")
		style.textContent =
			".hero-blast-pixels, .hero-blast-ripple { display: none !important }" +
			".hero-rise, .hero-rise * { color: transparent !important; background: transparent !important;" +
			" border-color: transparent !important; box-shadow: none !important;" +
			" text-decoration-color: transparent !important; fill: transparent !important;" +
			" stroke: transparent !important }"
		document.head.append(style)
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
		return {
			lines: lineBoxesOf(copy, origin),
			ground: getComputedStyle(hero).backgroundColor,
			box: {
				x: origin.left + window.scrollX,
				y: origin.top + window.scrollY,
				width: origin.width,
				height: origin.height,
			},
		}
	})
}
