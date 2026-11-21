import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The English home, whose demo window a phone reads one chat at a time (ADR 0022). */
const HOME = homeOf("en")

test.describe("the demo window on a phone with motion allowed", () => {
	test.use({ viewport: { width: 375, height: 812 }, reducedMotion: "no-preference" })

	test("turns the sidebar into a strip above the one chat on screen, inside the page's width", async ({
		page,
	}) => {
		await openPage(page, HOME)
		await expect(page.locator("[data-app]")).toHaveAttribute("data-stage", "without")
		await expect(page.locator('.app-chat[data-chat="without"]')).toBeVisible()
		await expect(page.locator('.app-chat[data-chat="with"]')).toBeHidden()
		const layout = await page.evaluate(() => {
			const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect()
			const side = box("[data-app-side]")
			const main = box(".app-main")
			const window = box("[data-app]")
			return {
				stripAboveChat: (side?.bottom ?? 0) <= (main?.top ?? 0) + 1,
				windowWidth: Math.round(window?.width ?? 0),
				windowHeight: Math.round(window?.height ?? 0),
				pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
			}
		})
		expect(layout.stripAboveChat, "the controls sit above the chat").toBe(true)
		expect(layout.windowWidth, "the window fits the phone").toBeLessThanOrEqual(375)
		expect(layout.pageOverflow, "the page does not scroll sideways").toBe(false)
		// One height, so the page does not move as the chats swap.
		const before = layout.windowHeight
		await page.locator("[data-app-new]").click()
		await expect(page.locator('.app-chat[data-chat="with"]')).toBeVisible()
		const after = await page.evaluate(() =>
			Math.round(document.querySelector("[data-app]")?.getBoundingClientRect().height ?? 0),
		)
		expect(after).toBe(before)
	})

	test("keeps the composer at the foot of the window and every control reachable", async ({
		page,
	}) => {
		await openPage(page, HOME)
		const composer = page.locator('.app-chat[data-chat="without"] .app-composer')
		await expect(composer).toBeVisible()
		for (const selector of [
			"[data-app-new]",
			'[data-app-chat="without"]',
			'[data-app-chat="with"]',
		]) {
			await expect(page.locator(selector)).toBeVisible()
			await expect(page.locator(selector)).toBeEnabled()
		}
		const inside = await page.evaluate(() => {
			const window = document.querySelector("[data-app]")?.getBoundingClientRect()
			const composer = document
				.querySelector('.app-chat[data-chat="without"] .app-composer')
				?.getBoundingClientRect()
			return (
				(composer?.bottom ?? 0) <= (window?.bottom ?? 0) &&
				(composer?.top ?? 0) >= (window?.top ?? 0)
			)
		})
		expect(inside, "the composer is inside the window").toBe(true)
	})
})
