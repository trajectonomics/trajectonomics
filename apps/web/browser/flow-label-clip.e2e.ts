import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureLabelClips, measureMarkedClip } from "./flow-label-clip"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

// Every name's painted box must fit its clip, with the clip reaching 2 units past the fitted words and
// stopping before the amount. A label's marks above the line (Thai tone marks, Vietnamese stacked marks)
// must also fit their clip's height; a clip as short as a text line cuts them.
for (const width of [360, 1280] as const) {
	test(`Cash flow keeps Thai and Vietnamese marks inside their clip at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })
		expect(await measureLabelClips(page)).toEqual([])
		expect(await measureMarkedClip(page)).toEqual([])
	})

	test(`the Estate keeps Thai and Vietnamese marks inside their clip at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveEstateLabels(page, await longEstateLabels(page))
		await openDemo(page, "/estate/?at=end", { theme: "light" })
		expect(await measureLabelClips(page)).toEqual([])
		expect(await measureMarkedClip(page)).toEqual([])
	})
}
