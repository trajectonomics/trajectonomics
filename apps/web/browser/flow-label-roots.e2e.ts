import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

// The diagram's text is pinned at 12px whatever the browser's own font size, because the drawing scales
// with its viewBox and the measurement assumes 12. A larger root must therefore change neither the fit nor
// where the amount sits: no name covers its amount or leaves the diagram.
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
