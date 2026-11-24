import type { Page } from "@playwright/test"

/** What a page measures as wider than the screen it is on. */
export interface Overflow {
	/** The page's own scroll width and the window's width, in CSS px. */
	readonly scrollWidth: number
	readonly innerWidth: number
	/** Each table that sticks out of the page and is not held, in words. */
	readonly tables: readonly string[]
}

/**
 * Measures a page in the browser. `scrollWidth <= innerWidth` is the "no horizontal page scroll" rule.
 * A table that sticks out of the page is held in two cases only: it sits in a visually hidden box (the
 * screen-reader-only copy of a table is a 1px clipped box), or, when `scroll` is true, it sits in a scroll
 * box (`overflow-x: auto` or `scroll`) that itself fits the page, so the table scrolls and the page does
 * not. On paper nothing scrolls, so print passes `scroll: false` and a table must simply fit.
 */
export function measureOverflow(page: Page, scroll: boolean): Promise<Overflow> {
	return page.evaluate((allowScroll) => {
		const width = document.documentElement.clientWidth
		const sticksOut = (box: DOMRect) => box.right > width + 0.5 || box.left < -0.5
		// The nearest box that clips or scrolls what is inside it.
		const clip = (table: Element) => {
			for (let box = table.parentElement; box !== null; box = box.parentElement) {
				const { overflowX } = getComputedStyle(box)
				if (overflowX !== "visible")
					return {
						scrolls: overflowX === "auto" || overflowX === "scroll",
						rect: box.getBoundingClientRect(),
					}
			}
			return null
		}
		const held = (table: Element) => {
			const box = clip(table)
			if (box === null) return false
			if (box.rect.width <= 2) return true
			return allowScroll && box.scrolls && !sticksOut(box.rect)
		}
		const outside = [...document.querySelectorAll("table")]
			.filter((table) => sticksOut(table.getBoundingClientRect()) && !held(table))
			.map((table) => {
				const head = table.querySelector("th")?.textContent?.trim().slice(0, 30) ?? ""
				return `table "${head}" is ${Math.round(table.getBoundingClientRect().width)}px wide`
			})
		return {
			scrollWidth: document.documentElement.scrollWidth,
			innerWidth: window.innerWidth,
			tables: outside,
		}
	}, scroll)
}

/**
 * The tables whose box lets a screen-reader-only label escape and widen the page (#352). The Demo has no
 * What-if session, whose labels ("What-if: ", "Change: ") sit in the far-right cells of a year table, so
 * this puts a label of the same class (`sr-only`, which is `position: absolute`) in the last cell of each
 * table, one at a time, and reads the page's scroll width. A scroll box that is not itself positioned
 * (`relative`) leaves the label to the page: it is placed where its cell is, past the right edge, and the
 * page scrolls sideways. The label is removed again.
 */
export function labelsEscaping(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const page = document.documentElement
		const escaping: string[] = []
		for (const table of document.querySelectorAll("table")) {
			const cell = table.querySelector("tr:last-child > :last-child")
			if (cell === null) continue
			const label = document.createElement("span")
			label.className = "sr-only"
			label.textContent = "label"
			cell.append(label)
			if (page.scrollWidth > page.clientWidth) {
				const head = table.querySelector("th")?.textContent?.trim().slice(0, 30) ?? ""
				escaping.push(
					`table "${head}" lets a screen-reader-only label widen the page to ${page.scrollWidth}px`,
				)
			}
			label.remove()
		}
		return escaping
	})
}
