import { expect, type Locator, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The English home's first header menu: the Star menu, whose panel holds the repository rows. */
const HOME = homeOf("en")

/** A point in the middle of one element's box, in the coordinates the mouse moves in. */
async function centreOf(locator: Locator) {
	const box = await locator.boundingBox()
	if (box === null) throw new Error("that control has no box to point at")
	return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

test.describe("the header menus on a fine pointer", () => {
	test("keeps the menu open while the pointer crosses the gap under its trigger", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const menu = page.locator("details[data-header-menu]").first()
		const firstRow = menu.locator("a").first()
		const trigger = await centreOf(menu.locator("summary"))
		await menu.locator("summary").hover()
		await expect(firstRow).toBeVisible()

		// The panel floats below the trigger: walk the pointer down the gap and onto the panel itself.
		const panel = await menu.locator(".header-menu-panel").boundingBox()
		if (panel === null) throw new Error("the open menu has no panel")
		const gap = panel.y - (trigger.box.y + trigger.box.height)
		expect(gap).toBeGreaterThan(0)
		const x = panel.x + panel.width / 2
		await page.mouse.move(x, trigger.box.y + trigger.box.height + gap / 2)
		await page.waitForTimeout(400)
		await expect(firstRow).toBeVisible()
		await page.mouse.move(x, panel.y + 20)
		await page.waitForTimeout(400)
		await expect(firstRow).toBeVisible()
	})

	test("closes after the pointer leaves the menu for good", async ({ page }) => {
		await openPage(page, HOME)
		const menu = page.locator("details[data-header-menu]").first()
		const firstRow = menu.locator("a").first()
		await menu.locator("summary").hover()
		await expect(firstRow).toBeVisible()
		await page.mouse.move(0, 500)
		await expect(firstRow).toBeHidden()
	})

	test("never closes a menu the pointer holds open, even when it is clicked", async ({ page }) => {
		await openPage(page, HOME)
		const menu = page.locator("details[data-header-menu]").first()
		const firstRow = menu.locator("a").first()
		await menu.locator("summary").hover()
		await expect(firstRow).toBeVisible()
		await menu.locator("summary").click()
		await expect(firstRow).toBeVisible()
	})

	test("closes on Escape, and an outside click closes what a click opened", async ({ page }) => {
		await openPage(page, HOME)
		const menu = page.locator("details[data-header-menu]").first()
		const firstRow = menu.locator("a").first()
		await menu.locator("summary").click()
		await expect(firstRow).toBeVisible()
		await page.keyboard.press("Escape")
		await expect(firstRow).toBeHidden()
		await menu.locator("summary").click()
		await expect(firstRow).toBeVisible()
		await page.mouse.click(200, 600)
		await expect(firstRow).toBeHidden()
	})
})
