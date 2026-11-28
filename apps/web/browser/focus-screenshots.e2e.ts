import { test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"
import { FOCUS_PAGES } from "./focus-point-pages"

// A picture of each slice (a) focus point for a person to look at, and the separate filing's Allowances
// point, which the plain page cannot show.
for (const path of FOCUS_PAGES) {
	const name = path.replace(/^\/|\/$/g, "").replaceAll("/", "-")
	test(`${name} focus point screenshot`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await openDemo(page, path, { theme: "light" })
		await page.locator("[data-focus-section]").screenshot({
			path: `${SCREENSHOTS}/focus-${name}.png`,
		})
	})
}

test("the Allowances focus point of a separate filing screenshot", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/optimize/allowances/?scenario=separate", { theme: "light" })
	await page.locator("[data-focus-section]").screenshot({
		path: `${SCREENSHOTS}/focus-allowances-separate.png`,
	})
})
