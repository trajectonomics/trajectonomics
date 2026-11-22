import type { Page } from "@playwright/test"
import { SITE_HOME_NAME, SITE_HOME_PATH } from "../src/lib/site-home"
import { DOCS_BASE_PATH, TABS, tabUrl } from "../src/lib/tabs"
import { NOT_FOUND_PATH, openPage } from "./built-site"
import { waitForIsland } from "./docs-portal"
import { expect, test } from "./fixtures"
import { TEST_VIEWPORT_HEIGHT_PX } from "./viewports"

/** Whether `url` is the Site Home. The link is absolute, so the path alone is not enough. */
function isSiteHome(url: URL): boolean {
	const home = new URL(SITE_HOME_PATH)
	return url.origin === home.origin && url.pathname === home.pathname
}

/** The pages of each layout: a docs page (notebook), the Landing Page and the 404 page (home). */
const PAGES = [
	{ name: "a Tab page", path: tabUrl(TABS[0]) },
	{ name: "the Landing Page", path: `${DOCS_BASE_PATH}/` },
	{ name: "the 404 page", path: NOT_FOUND_PATH },
] as const

/** The header each layout renders: the home layout's, and the notebook layout's. */
const HEADER = "#nd-nav, #nd-subnav"

/** A Site Home document, so the browser test never asks the network for trajectonomics.com. */
const SITE_HOME_DOCUMENT = "<!doctype html><html lang='en'><title>Site Home</title></html>"

/** The header's glyph tile, the one way back to the Site Home. */
function glyphTile(page: Page) {
	return page.locator(HEADER).getByRole("link", { name: SITE_HOME_NAME, exact: true })
}

for (const widthPx of [390, 1280, 2000]) {
	for (const pageUnderTest of PAGES) {
		test(`the header's glyph tile leads to the Site Home on ${pageUnderTest.name} at ${widthPx}px`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: widthPx, height: TEST_VIEWPORT_HEIGHT_PX })
			await openPage(page, pageUnderTest.path)
			await waitForIsland(page)

			// In the header itself at a phone's width too, never behind a menu, as on the blog.
			await expect(glyphTile(page)).toHaveCount(1)
			await expect(glyphTile(page)).toBeVisible()
			await expect(glyphTile(page)).toHaveAttribute("href", SITE_HOME_PATH)
		})
	}
}

for (const pageUnderTest of PAGES.filter((candidate) => candidate.name !== "a Tab page")) {
	test(`${pageUnderTest.name} draws no empty phone menu at 390px`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: TEST_VIEWPORT_HEIGHT_PX })
		await openPage(page, pageUnderTest.path)
		await waitForIsland(page)

		// The home layout's menu held only the way back, which the tile now is (ADR 0009), so no
		// header button but the search is drawn. A renamed Fumadocs label would fail here.
		const buttons = page.locator("#nd-nav button").filter({ visible: true })
		await expect(buttons).toHaveCount(1)
		await expect(buttons).toHaveAttribute("data-search", "")
	})
}

test("clicking the glyph tile loads trajectonomics.com as a new document", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: TEST_VIEWPORT_HEIGHT_PX })
	await openPage(page, tabUrl(TABS[0]))
	await page.route(
		(url) => isSiteHome(url),
		(route) => route.fulfill({ status: 200, contentType: "text/html", body: SITE_HOME_DOCUMENT }),
	)

	const siteHomeRequests: string[] = []
	page.on("request", (request) => {
		if (isSiteHome(new URL(request.url()))) {
			siteHomeRequests.push(request.resourceType())
		}
	})

	const link = glyphTile(page)
	await link.hover()
	// Longer than Astro's 80ms hover prefetch debounce.
	await page.waitForTimeout(300)
	expect(siteHomeRequests, "hovering fetched the Site Home").toEqual([])

	await link.click()
	await expect.poll(() => siteHomeRequests).toEqual(["document"])
	await expect(page).toHaveURL(SITE_HOME_PATH)
})
