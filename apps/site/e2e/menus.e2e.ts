import { expect, type Locator, test } from "@playwright/test"
import { GITHUB_REPO_URL } from "../src/lib/site"
import { homeOf, openPage } from "./pages"

/** The English home. Its header links one repository, and its one menu is the Language menu. */
const HOME = homeOf("en")

/** A point in the middle of one element's box, in the coordinates the mouse moves in. */
async function centreOf(locator: Locator) {
	const box = await locator.boundingBox()
	if (box === null) throw new Error("that control has no box to point at")
	return { x: box.x + box.width / 2, y: box.y + box.height / 2, box }
}

test.describe("the header's repository link", () => {
	test("is one link to the one repository, with its star count", async ({ page }) => {
		await openPage(page, HOME)
		const link = page.locator("header a.header-repo")
		await expect(link).toHaveCount(1)
		await expect(link).toHaveAttribute("href", GITHUB_REPO_URL)
		await expect(link).toHaveText(/^(?:\d{1,3}|\d{1,3}(?:\.\d)?K)$/)
		await expect(page.locator("header details[data-header-menu]")).toHaveCount(1)
		await expect(page.locator(".header-menu-star")).toHaveCount(0)
	})
})

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

	test("closes when Tab moves focus out of it", async ({ page }) => {
		await openPage(page, HOME)
		const menu = page.locator("details[data-header-menu]").first()
		const firstRow = menu.locator("a").first()
		await menu.locator("summary").focus()
		await page.keyboard.press("Enter")
		await expect(firstRow).toBeVisible()
		// Walk the tab order until focus is outside the disclosure, then it must be shut behind us.
		for (let stop = 0; stop < 12; stop++) {
			const inside = await page.evaluate(
				() =>
					document.querySelector("details[data-header-menu]")?.contains(document.activeElement) ??
					false,
			)
			if (!inside) break
			await page.keyboard.press("Tab")
		}
		await expect(firstRow).toBeHidden()
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
