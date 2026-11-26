import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureMarkedClip } from "./flow-label-clip"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

// A label's marks above the line (Thai tone marks, Vietnamese stacked marks) must fit their clip; a clip as
// short as a text line cuts them. The same check holds each name's painted box inside its clip and keeps
// the clip clear of the amount.
for (const width of [360, 1280] as const) {
	test(`Cash flow keeps Thai and Vietnamese marks inside their clip at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })
		expect(await measureMarkedClip(page)).toEqual([])
	})

	test(`the Estate keeps Thai and Vietnamese marks inside their clip at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveEstateLabels(page, await longEstateLabels(page))
		await openDemo(page, "/estate/?at=end", { theme: "light" })
		expect(await measureMarkedClip(page)).toEqual([])
	})
}
