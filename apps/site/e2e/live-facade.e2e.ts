import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { DEMO_PATH } from "../src/lib/site"
import { expectRingVisible, focusableCount } from "./controls"
import { homeOf, openPage } from "./pages"

/** The English home, whose hero carries the hosted Dashboard behind a click-to-load facade (ADR 0035). */
const HOME = homeOf("en")

test("the hero waits for the visitor before it loads the Dashboard", async ({ page }) => {
	await openPage(page, HOME)
	// The facade is a real link, and the whole of the frame's markup is inside <noscript>: a scripted
	// page has no iframe in its DOM until the visitor acts (ADR 0035).
	await expect(
		page.getByRole("link", { name: dictionaryFor(HOME.language).liveDemoStart }),
	).toHaveAttribute("href", DEMO_PATH)
	await expect(page.locator("iframe[data-live-frame]")).toHaveCount(0)
	await page.mouse.wheel(0, 400)
	await expect(page.locator("iframe[data-live-frame]")).toHaveCount(1, { timeout: 10_000 })
})

test("a first keypress starts the Dashboard too", async ({ page }) => {
	await openPage(page, HOME)
	await expect(page.locator("iframe[data-live-frame]")).toHaveCount(0)
	await page.keyboard.press("Tab")
	await expect(page.locator("iframe[data-live-frame]")).toHaveCount(1, { timeout: 10_000 })
})

test("the facade is a Tab stop that paints the Site's ring", async ({ page }) => {
	// The Demo answers nothing, so the frame never loads and the facade stays put to be walked to.
	await page.route("**/demo/**", () => undefined)
	await openPage(page, HOME)
	const count = await focusableCount(page)
	let reached = false
	for (let stop = 0; stop < count && !reached; stop++) {
		await page.keyboard.press("Tab")
		reached = await page.evaluate(
			() => document.activeElement?.hasAttribute("data-live-start") ?? false,
		)
	}
	expect(reached, "Tab reaches the live window's start facade").toBe(true)
	await expectRingVisible(page, "the live window's start facade paints its ring")
})

test("Enter on the facade hands the focus to the Dashboard, under reduced motion too", async ({
	page,
}) => {
	// The kill switch gives every property a 0.01 ms transition; the frame must still be visible, and so
	// focusable, when the script hands it the focus (ADR 0035).
	await page.emulateMedia({ reducedMotion: "reduce" })
	await openPage(page, HOME)
	await page.locator("[data-live-start]").focus()
	await page.keyboard.press("Enter")
	await expect(page.locator("[data-live-start]")).toHaveCount(0, { timeout: 10_000 })
	expect(
		await page.evaluate(() => document.activeElement?.hasAttribute("data-live-frame") ?? false),
		"the focus is on the Dashboard's frame, not dropped to the page",
	).toBe(true)
	expect(page.url()).toBe(new URL(HOME.path, page.url()).href)
})

test("a modified click on the facade opens the Dashboard in a new tab", async ({ page }) => {
	await openPage(page, HOME)
	const opened = page.context().waitForEvent("page")
	await page.locator("[data-live-start]").click({ modifiers: ["ControlOrMeta"] })
	const tab = await opened
	await tab.waitForURL((url) => url.pathname === DEMO_PATH)
	await tab.close()
	expect(page.url()).toBe(new URL(HOME.path, page.url()).href)
})
