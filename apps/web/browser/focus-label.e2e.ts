import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { lineHitsTheLabel } from "./focus-line"

// The runs-out line used to be drawn across its own answer. The label's whole box now sits clear of
// the curve: inside the plot where a place fits, else in a band the chart reserves above the plot.
// The test samples the drawn path at every width to prove no point of it enters the box.
test("the label's box stays clear of the line it names at every width", async ({ page }) => {
	for (const width of [320, 360, 1024, 1280]) {
		await page.setViewportSize({ width, height: 800 })
		for (const path of ["/", "/?scenario=retire-early"]) {
			await openDemo(page, path, { theme: "light" })
			const lines = page.locator("[data-focus-line]")
			expect(await lines.count(), `${width}px ${path}: the drawn line`).toBeGreaterThan(0)
			const hits = await page.evaluate(lineHitsTheLabel)
			expect(hits, `${width}px ${path}: the line through the label's box`).toEqual([])
		}
	}
})
