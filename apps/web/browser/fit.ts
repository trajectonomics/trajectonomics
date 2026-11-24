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
 * The tables whose box lets a screen-reader-only label escape and widen the page (#352). A What-if
 * session's labels ("What-if: ", "Change: ") sit in the far-right cells of its year table, and that table is
 * never rendered in the Demo (it needs the edit server), so this puts a label of the same class (`sr-only`,
 * which is `position: absolute`) in the last cell of the last row of each table, one at a time, and reads
 * the page's scroll width. A table inside a scroll box is also made 200px wider than the screen for the
 * moment, so the label is far past the edge whatever the fonts measure. A scroll box that is not itself
 * positioned (`relative`) leaves the label to the page, and the page scrolls sideways; any widening fails.
 * The label and the width are removed again.
 *
 * The last row, not a CSS `tr:last-child`: the sticky header row of a `DataTable` is the first row of
 * its own `thead`, so that selector found the header and the label stayed inside a positioned cell.
 */
export function labelsEscaping(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const root = document.documentElement
		const scrolls = (table: HTMLTableElement) => {
			for (let box = table.parentElement; box !== null; box = box.parentElement) {
				const { overflowX } = getComputedStyle(box)
				if (overflowX === "auto" || overflowX === "scroll") return true
			}
			return false
		}
		// The page's scroll width with a label in the cell, and the table made wide when it scrolls.
		const widthWithLabel = (table: HTMLTableElement, cell: Element) => {
			const label = document.createElement("span")
			label.className = "sr-only"
			label.textContent = "label"
			cell.append(label)
			if (scrolls(table)) table.style.minWidth = "calc(100vw + 200px)"
			const width = root.scrollWidth
			table.style.minWidth = ""
			label.remove()
			return width
		}
		const probe = (table: HTMLTableElement): string | null => {
			const cell = table.rows[table.rows.length - 1]?.lastElementChild ?? null
			const width = cell === null ? 0 : widthWithLabel(table, cell)
			if (width <= root.clientWidth) return null
			const head = table.querySelector("th")?.textContent?.trim().slice(0, 30) ?? ""
			return `table "${head}" lets a screen-reader-only label widen the page to ${width}px`
		}
		const escaping = [...document.querySelectorAll("table")]
			.map(probe)
			.filter((found): found is string => found !== null)
		return escaping
	})
}
