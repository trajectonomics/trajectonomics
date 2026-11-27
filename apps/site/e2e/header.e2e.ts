import { expect, test } from "@playwright/test"
import { homeOf, OPENJOT_PAGES, openPage } from "./pages"

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

test.describe("the header on a 360 px phone", () => {
	test.use({ viewport: { width: 360, height: 740 } })

	for (const openJot of OPENJOT_PAGES) {
		test(`fits the four links, the repository count and the Language menu on the ${openJot.name} without a sideways scroll`, async ({
			page,
		}) => {
			await openPage(page, openJot)
			const widths = await page.evaluate(() => ({
				client: document.documentElement.clientWidth,
				document: document.documentElement.scrollWidth,
				body: document.body.scrollWidth,
			}))
			expect(Math.max(widths.document, widths.body)).toBeLessThanOrEqual(widths.client)
			await expect(page.locator("header.site-header a[href='/openjot/']")).toHaveAttribute(
				"aria-current",
				"page",
			)
		})
	}
})
