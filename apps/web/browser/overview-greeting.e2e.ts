import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

// Home greets the reader with the household's holder and the Site's hello robot beside the title
// (#928). The robot is decoration: it is small at both widths and gone from paper.
test("greets Home with the mascot beside its title, and keeps it off paper", async ({ page }) => {
	for (const width of [360, 1280]) {
		await page.setViewportSize({ width, height: 800 })
		await openDemo(page, "/", { theme: "light" })
		await expect(page.getByRole("heading", { level: 1 })).toHaveText(
			"Hello there, this is your current situation",
		)
		const mascot = page.locator("[data-overview-mascot]")
		await expect(mascot).toBeVisible()
		const box = await mascot.boundingBox()
		expect(Math.round(box?.width ?? 0), `the mascot's width at ${width}px`).toBe(60)
		expect(Math.round(box?.height ?? 0), `the mascot's height at ${width}px`).toBe(40)
	}
	await page.emulateMedia({ media: "print" })
	await expect(page.locator("[data-overview-mascot]")).toBeHidden()
})
