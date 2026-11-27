import type { Page } from "@playwright/test"

/** Two frames: one for an observer to hear a change, one for the derived fit to redraw. */
export function frames(page: Page): Promise<unknown> {
	return page.evaluate(
		() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
	)
}

/**
 * Counts the probe's `getComputedTextLength` calls: each is a width the page had to measure. A cache that
 * was not cleared measures nothing here, because every string it is asked for was measured before.
 */
export function countMeasurements(page: Page): Promise<unknown> {
	return page.addInitScript(() => {
		const original = SVGTextElement.prototype.getComputedTextLength
		let count = 0
		SVGTextElement.prototype.getComputedTextLength = function (this: SVGTextElement) {
			if (this.hasAttribute("data-flow-probe")) count += 1
			return original.call(this)
		}
		Object.defineProperty(window, "__flowMeasurements", { get: () => count })
		Object.defineProperty(window, "__resetFlowMeasurements", {
			value: () => {
				count = 0
			},
		})
	})
}

/** The probe's measurements since the last reset. */
export function measurements(page: Page): Promise<number> {
	return page.evaluate(
		() => (window as unknown as { __flowMeasurements: number }).__flowMeasurements ?? -1,
	)
}

/** Starts counting from the next measurement. */
export function resetMeasurements(page: Page): Promise<unknown> {
	return page.evaluate(() => {
		const counter = window as unknown as { __resetFlowMeasurements: () => void }
		counter.__resetFlowMeasurements()
	})
}
