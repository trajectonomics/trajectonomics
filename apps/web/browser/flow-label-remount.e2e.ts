import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

/** Two frames: one for an observer to hear a change, one for the derived fit to redraw. */
function frames(page: Page): Promise<unknown> {
	return page.evaluate(
		() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
	)
}

/** Follows a page in the app itself: the menu drawer on a phone, the sidebar on a wide screen. */
async function follow(page: Page, name: string): Promise<void> {
	const menu = page.getByRole("button", { name: "Open the menu" })
	if (await menu.isVisible()) await menu.click()
	await page.getByRole("navigation", { name: "Pages" }).getByRole("link", { name }).click()
	await frames(page)
}

/** Changes the browser's root font size, the way a person's setting does, while another page is shown. */
async function changeRoot(page: Page, pixels: number): Promise<void> {
	await page.evaluate((size) => {
		document.documentElement.style.fontSize = `${size}px`
	}, pixels)
}

/** Waits until the page's diagram is drawn and fitted, then names any fault it still has. */
async function settleFit(page: Page): Promise<string[]> {
	await expect(page.locator("[data-flow-label]:visible").first()).toBeVisible()
	await frames(page)
	return measureFlowLabels(page)
}

// The widths are cached for the whole session, but the root font can change while another page is shown.
// A change made on Net worth must not leave the diagram fitting its names at the old size when it comes
// back: every name is measured again at the size it now draws (#718).
for (const width of [360, 1280] as const) {
	test(`Cash flow refits after a font change made on Net worth, ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })
		expect(await measureFlowLabels(page), "before leaving").toEqual([])
		await follow(page, "Net worth")
		await expect(page).toHaveURL(/\/net-worth\//)
		await changeRoot(page, 24)
		await follow(page, "Cash flow")
		await expect(page).toHaveURL(/\/cash-flow/)
		expect(await settleFit(page)).toEqual([])
	})

	test(`the Estate refits after a font change made on Net worth, ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 800 })
		await serveEstateLabels(page, await longEstateLabels(page))
		await openDemo(page, "/estate/?estate=end", { theme: "light" })
		expect(await measureFlowLabels(page), "before leaving").toEqual([])
		await follow(page, "Net worth")
		await expect(page).toHaveURL(/\/net-worth\//)
		await changeRoot(page, 24)
		await follow(page, "Estate")
		await expect(page).toHaveURL(/\/estate\//)
		expect(await settleFit(page)).toEqual([])
	})
}
