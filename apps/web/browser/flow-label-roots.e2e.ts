import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

/** The diagram text's computed size, in CSS px, read from a drawn label. */
function diagramText(page: Page): Promise<number> {
	return page.evaluate(() => {
		const label = document.querySelector<SVGTextElement>("[data-flow-label]")
		return label === null ? 0 : Number.parseFloat(getComputedStyle(label).fontSize)
	})
}

// The diagram's text is `text-xs`, so a larger browser font grows it, and the fit is measured at the size
// it draws. A larger root must therefore change neither the fit nor where the amount sits: no name covers
// its amount or leaves the diagram.
for (const width of [360, 1280] as const) {
	test(`Cash flow keeps its names off their amounts at a 20px root, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light", rootFontSize: 20 })
		expect(await measureFlowLabels(page)).toEqual([])
	})

	test(`the Estate keeps its names off their amounts at a 20px root, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveEstateLabels(page, await longEstateLabels(page))
		await openDemo(page, "/estate/?at=end", { theme: "light", rootFontSize: 20 })
		expect(await measureFlowLabels(page)).toEqual([])
	})
}

test("the diagram text grows with the browser's font size", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await serveFlowLabels(page, await longFlowLabels(page))
	await openDemo(page, "/cash-flow/", { theme: "light" })
	const atDefault = await diagramText(page)
	await openDemo(page, "/cash-flow/", { theme: "light", rootFontSize: 20 })
	const atLarge = await diagramText(page)
	expect(atDefault).toBeCloseTo(12, 1)
	expect(atLarge).toBeGreaterThan(atDefault)
})
