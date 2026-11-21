import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The English home, whose header carries the repository link and the scroll ground. */
const HOME = homeOf("en")

/** The header's painted background, read after the scroll-driven animation has settled. */
async function groundOf(page: import("@playwright/test").Page): Promise<string> {
	const header = page.locator("header.site-header")
	return header.evaluate((element) => getComputedStyle(element).backgroundColor)
}

test.describe("the header's ground", () => {
	test("is a hole at the top and settles onto the Theme once the page scrolls", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const atTop = await groundOf(page)
		expect(atTop).toMatch(/rgba\(0, 0, 0, 0\)|transparent/)

		await page.evaluate(() => window.scrollTo(0, 400))
		await page.waitForTimeout(200)
		const scrolled = await groundOf(page)
		expect(scrolled).not.toBe(atTop)
		expect(scrolled).toMatch(/^rgb\(/)
	})
})
