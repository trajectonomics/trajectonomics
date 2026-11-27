import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { NETFLIX, SUBSCRIPTIONS } from "./flow-label-cases"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

/** The paper's content width: A4 landscape with 12mm margins, as `print.e2e.ts` states it. */
const A4_LANDSCAPE_CONTENT_PX = 1032

/** The names the wide diagram drew, whether or not its wrapper is hidden at this window's width. */
function hiddenWideNames(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const wide = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].find(
			(svg) => Math.round(svg.viewBox.baseVal.width) === 800,
		)
		return [...(wide?.querySelectorAll("[data-flow-label]") ?? [])].map(
			(element) => element.textContent ?? "",
		)
	})
}

/** Two frames: one for an observer to hear a resize, one for the derived fit to redraw. */
function frames(page: Page): Promise<unknown> {
	return page.evaluate(
		() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
	)
}

// Print from a narrow window lays the page out on A4, where the wide diagram is drawn. It is measured
// through the always-drawn probe while the window is still narrow, so its names print whole (#718).
test("printing from a 360px window prints the wide diagram's names whole", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await serveFlowLabels(page, await longFlowLabels(page))
	await openDemo(page, "/cash-flow/", { theme: "light" })
	// The wide diagram is fitted at the drawn size before print, not only after the paper is laid out.
	const hidden = await hiddenWideNames(page)
	expect(hidden).toContain(SUBSCRIPTIONS)
	expect(hidden).toContain(NETFLIX)

	await page.emulateMedia({ media: "print" })
	await page.setViewportSize({ width: A4_LANDSCAPE_CONTENT_PX, height: 800 })
	await frames(page)
	const drawn = await page.evaluate(() =>
		[...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')]
			.filter((svg) => svg.getBoundingClientRect().width > 0)
			.map((svg) => Math.round(svg.viewBox.baseVal.width)),
	)
	expect(drawn, "the wide diagram is the one printed").toEqual([800])
	expect(await measureFlowLabels(page), "no name covers an amount or leaves the diagram").toEqual(
		[],
	)
	const labels = await page.locator("[data-flow-label]:visible").allTextContents()
	expect(labels).toContain(SUBSCRIPTIONS)
	expect(labels).toContain(NETFLIX)
})
