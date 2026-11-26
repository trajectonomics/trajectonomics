import { expect, type Page, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"
import { measureOverflow } from "./fit"

// The Demo's `separate` Scenario files separately (cli ADR-0075), so the Allowances page shows one section per
// Return with that Return's own ceilings. These checks run at 360px and 1280px, and neither scrolls sideways.

async function fits(page: Page): Promise<void> {
	const fit = await measureOverflow(page, true)
	expect(fit.tables, "tables outside a scroll box").toEqual([])
	expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
}

for (const width of [360, 1280]) {
	test(`the Allowances page shows each Return of a separate filing at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await openDemo(page, "/optimize/allowances/?scenario=separate", { theme: "light" })
		await expect(page.getByRole("heading", { name: "You", exact: true })).toBeVisible()
		await expect(page.getByRole("heading", { name: "Your partner", exact: true })).toBeVisible()
		await expect(page.locator("main")).toContainText("th-2026-pit@me")
		await expect(page.locator("main")).toContainText("th-2026-pit@partner")
		await page.screenshot({
			path: `${SCREENSHOTS}/allowances-returns/${width}.png`,
			fullPage: true,
		})
		await fits(page)
	})
}
