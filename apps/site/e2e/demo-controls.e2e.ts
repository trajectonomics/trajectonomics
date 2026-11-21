import { expect, test } from "@playwright/test"
import { bubble, dictionary, HOME, stage, WITH_MS } from "./demo"
import { openPage } from "./pages"

test.describe("the demo window's controls with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	test("a click on New chat does not wait for the first chat to end", async ({ page }) => {
		await openPage(page, HOME)
		await page.locator("[data-app-new]").click()
		await expect(stage(page)).toHaveAttribute("data-stage", "with")
		await expect(page.locator('.app-chat[data-chat="with"]')).toHaveAttribute("data-motion", "play")
		await expect(page.locator('.app-chat[data-chat="without"]')).toBeHidden()
		// The chat starts from its first beat: its last message has not landed.
		await expect(page.locator(bubble("with", 6))).toHaveCSS("opacity", "0")
	})

	test("a chat in the sidebar opens settled, with every message shown and nothing playing", async ({
		page,
	}) => {
		await openPage(page, HOME)
		await page.locator("[data-app-new]").click()
		await page.locator('[data-app-chat="without"]').click()
		await expect(stage(page)).toHaveAttribute("data-stage", "without")
		const alone = page.locator('.app-chat[data-chat="without"]')
		await expect(alone).not.toHaveAttribute("data-motion", /.+/)
		for (let index = 0; index < 8; index++) {
			await expect(page.locator(bubble("without", index))).toHaveCSS("opacity", "1")
		}
		await expect(alone).toContainText(dictionary.actionConfession)
	})

	test("Replay starts again from the first chat", async ({ page }) => {
		await openPage(page, HOME)
		await page.locator("[data-app-new]").click()
		const replay = page.locator("[data-app-replay]")
		await expect(replay).toHaveText(dictionary.replay)
		await replay.click()
		await expect(stage(page)).toHaveAttribute("data-stage", "without")
		await expect(page.locator('.app-chat[data-chat="without"]')).toHaveAttribute(
			"data-motion",
			"play",
		)
		await expect(page.locator(bubble("without", 7))).toHaveCSS("opacity", "0")
	})

	test("scrolling away and back does not replay a chat that has settled", async ({ page }) => {
		test.setTimeout(60_000)
		await openPage(page, HOME)
		await page.locator("[data-app-new]").click()
		await expect(page.locator(bubble("with", 6))).toHaveCSS("opacity", "1", {
			timeout: WITH_MS + 2_000,
		})
		await page.locator("h1").scrollIntoViewIfNeeded()
		await page.locator("[data-app]").scrollIntoViewIfNeeded()
		await page.waitForTimeout(600)
		await expect(page.locator(bubble("with", 6))).toHaveCSS("opacity", "1")
		await expect(stage(page)).toHaveAttribute("data-stage", "with")
	})

	test("keeps the newest message of a playing chat in view, and makes the transcript a Tab stop", async ({
		page,
	}) => {
		test.setTimeout(60_000)
		await openPage(page, HOME)
		await page.locator("[data-app-new]").click()
		const region = page.locator('.app-chat[data-chat="with"] .app-scroll')
		await expect(region).toHaveAttribute("tabindex", "0")
		await expect(region).toHaveCSS("overflow-y", "auto")
		// The chat is taller than the window, so a reader without the script would scroll it themselves.
		await expect
			.poll(() => region.evaluate((body) => body.scrollTop), { timeout: WITH_MS })
			.toBeGreaterThan(0)
		const framed = await region.evaluate((body) => {
			const shown = [...body.querySelectorAll(".chat-message")].filter(
				(message) =>
					Number.parseFloat(
						getComputedStyle(message.querySelector(".chat-bubble") ?? message).opacity,
					) > 0.5,
			)
			const newest = shown.at(-1)?.getBoundingClientRect()
			if (newest === undefined) throw new Error("no message to frame")
			return {
				newest: Math.round(newest.bottom),
				box: Math.round(body.getBoundingClientRect().bottom),
			}
		})
		// The chat scrolls itself, so the newest message is inside the transcript's frame.
		expect(framed.newest).toBeLessThanOrEqual(framed.box + 2)
	})
})
