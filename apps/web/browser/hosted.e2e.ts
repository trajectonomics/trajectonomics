import { expect, test } from "@playwright/test"
import { HOSTED_PREFIX } from "./base-url"
import { SCREENSHOTS } from "./demo"
import { labelsEscaping, measureOverflow } from "./fit"
import {
	DEMO_SNAPSHOT,
	failures,
	imageWidth,
	logRequests,
	openHosted,
	snapshotsRead,
	strays,
} from "./hosted"
import { EDIT_PAGES, PAGES, pageName } from "./pages"

// The hosted Demo (web ADR 0028), served under /demo/ as the Site serves it: every page at a phone and a desktop,
// with the fit rules of the loopback Demo plus the hosted promise: only own GETs, only the Demo snapshot, all Edits off.
const WIDTHS_PX = [360, 1280] as const
const HEIGHT_PX = 800

/** Home's greeting mascot: its bitmap width proves the hosted build served the image itself. */
const MASCOT = "[data-overview-mascot]"

for (const width of WIDTHS_PX) {
	for (const path of PAGES) {
		test(`hosted ${pageName(path)} fits a ${width}px screen and sends nothing but reads of its own files`, async ({
			page,
		}) => {
			await page.setViewportSize({ width, height: HEIGHT_PX })
			const requests = logRequests(page)
			await openHosted(page, path)
			await page.screenshot({
				path: `${SCREENSHOTS}/hosted/${width}/${pageName(path)}.png`,
				fullPage: true,
			})

			const fit = await measureOverflow(page, true)
			expect(fit.tables, "tables outside a scroll box").toEqual([])
			expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
			expect(await labelsEscaping(page)).toEqual([])

			expect(strays(requests), "requests that are not a GET under /demo/ of this origin").toEqual(
				[],
			)
			expect(failures(requests), "responses with an error status under /demo/").toEqual([])
			expect(snapshotsRead(requests)).toEqual([DEMO_SNAPSHOT])
			await expect(page.getByRole("note", { name: "About this demo" })).toBeVisible()
			// Home's mascot is an image of this build: a broken src still draws its 60x40 box, so only
			// the image's own width proves the src under /demo/ loaded.
			if (path === "/")
				expect(await imageWidth(page, MASCOT), "the mascot's image loads").toBeGreaterThan(0)
		})
	}
}

for (const path of PAGES) {
	test(`hosted ${pageName(path)}: every link stays under ${HOSTED_PREFIX}/, every Edit control is off and says why, and a click sends nothing`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: HEIGHT_PX })
		const requests = logRequests(page)
		await openHosted(page, path)

		const links = await page
			.locator("a[href]")
			.evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href") ?? ""))
		expect(
			links.filter((href) => href.startsWith("/") && !href.startsWith(`${HOSTED_PREFIX}/`)),
		).toEqual([])

		const off = page.locator('main :disabled[title], [role="menu"] :disabled[title]')
		const titles = await off.evaluateAll((controls) =>
			controls.map((c) => c.getAttribute("title") ?? ""),
		)
		for (const title of titles) expect(title).toContain("traj dashboard")
		if (EDIT_PAGES.includes(path)) expect(titles.length, "switched-off controls").toBeGreaterThan(0)

		// A click on every control still on, outside a dialog: none of them may send a request.
		const clicks = page.locator("main button:enabled:not(dialog *)")
		const count = path === "/reports/" ? 0 : await clicks.count()
		for (let index = 0; index < count; index++) {
			const control = clicks.nth(index)
			if (await control.isVisible())
				await control.click({ trial: false, timeout: 2000 }).catch(() => undefined)
		}
		await page.waitForLoadState("networkidle")
		expect(strays(requests), "requests that are not a GET under /demo/ of this origin").toEqual([])
		expect(failures(requests), "responses with an error status under /demo/").toEqual([])
		expect(snapshotsRead(requests)).toEqual([DEMO_SNAPSHOT])
	})
}

test("hosted: the navigation stays under /demo/ and reads the Demo snapshot once for the whole visit", async ({
	page,
}) => {
	const requests = logRequests(page)
	await openHosted(page, "/")
	await page
		.getByRole("navigation", { name: "Pages" })
		.getByRole("link", { name: "Net worth" })
		.click()
	await expect(page).toHaveURL(/\/demo\/net-worth\/$/)
	await expect(page.getByRole("heading", { level: 1, name: "Net worth" })).toBeVisible()
	expect(strays(requests)).toEqual([])
	expect(failures(requests)).toEqual([])
	expect(snapshotsRead(requests)).toEqual([DEMO_SNAPSHOT])
	expect(requests.seen.filter((line) => line.endsWith(DEMO_SNAPSHOT))).toHaveLength(1)
})

test("hosted: a page outside the base path is not served, so nothing can read the loopback build by mistake", async ({
	request,
}) => {
	const outside = await request.get("/snapshot.json")
	expect(outside.status()).toBe(404)
	const page = await request.get(`${HOSTED_PREFIX}/`)
	expect(page.status()).toBe(200)
})
