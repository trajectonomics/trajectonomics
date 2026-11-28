import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

for (const width of [360, 1280]) {
	test(`Milestones draws its pin label inside its clipping box at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 })
		await openDemo(page, "/milestones/", { theme: "light" })
		const label = page.locator("[data-pin-label]")
		await expect(label).toContainText("At 40")
		const [inner, outer] = await label.evaluate((element) => {
			const box = element.closest(".overflow-hidden")?.getBoundingClientRect()
			const own = element.getBoundingClientRect()
			return [
				[own.top, own.bottom, own.left, own.right],
				box === undefined ? [] : [box.top, box.bottom, box.left, box.right],
			]
		})
		const [top, bottom, left, right] = outer
		expect(inner[0]).toBeGreaterThanOrEqual(top ?? Number.NaN)
		expect(inner[1]).toBeLessThanOrEqual(bottom ?? Number.NaN)
		expect(inner[2]).toBeGreaterThanOrEqual(left ?? Number.NaN)
		expect(inner[3]).toBeLessThanOrEqual(right ?? Number.NaN)
	})
}
