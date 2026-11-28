import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureFlowLabels } from "./flow-label-fit"

/** Opens the Estate on its last year, with hard names on that date's lines, after checking every label. */
async function drawnEstate(page: Page): Promise<string[]> {
	await serveEstateLabels(page, await longEstateLabels(page))
	await openDemo(page, "/estate/?estate=end", { theme: "light" })
	expect(await measureFlowLabels(page)).toEqual([])
	return page.locator("[data-flow-label]:visible").allTextContents()
}

// The Estate's diagram is the same drawing as Cash flow's, so its start-anchored names take the same clip
// and measurement. The Demo's own estate lines are short, so the check puts the review's hard names on
// them: the date the page opens on is the same one `?estate=end` asks for.
for (const width of [360, 1280] as const) {
	test(`the Estate diagram keeps its hard names inside and off their amounts at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		const labels = await drawnEstate(page)
		expect(labels.length).toBeGreaterThan(0)
		expect(labels.some((text) => text.startsWith("㈱"))).toBe(true)
		expect(labels.some((text) => /^W+…$/.test(text))).toBe(true)
	})
}

// An old link put the Estate's date in `?at=`. It is not a viewing month, so the page still reads it as its own.
test("an old ?at= link opens the Estate on that date, not the default", async ({ page }) => {
	await openDemo(page, "/estate/?at=milestone:car-paid-off", { theme: "light" })
	await expect(page.locator("#estate-date")).toHaveValue("milestone:car-paid-off")
})

// `?estate=` wins over `?at=`, which now holds the viewing date; a month there is no Estate choice.
test("?estate= wins over a viewing month in ?at=", async ({ page }) => {
	await openDemo(page, "/estate/?estate=milestone:car-paid-off&at=2031-03", { theme: "light" })
	await expect(page.locator("#estate-date")).toHaveValue("milestone:car-paid-off")
})
