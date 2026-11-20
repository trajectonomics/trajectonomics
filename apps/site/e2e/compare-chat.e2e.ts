import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { COMPARE_ALONE, sequenceTimeline } from "../src/lib/motion/timeline"
import { homeOf, openPage } from "./pages"

/** The English home, whose comparison a phone reads one chat at a time. */
const HOME = homeOf("en")
const dictionary = dictionaryFor(HOME.language)

/** How long the before chat takes to be read, so the offer to move on is there after it. */
const READ_MS = sequenceTimeline(COMPARE_ALONE).totalMs

test.describe("the comparison's chats on a phone with motion allowed", () => {
	test.use({ viewport: { width: 375, height: 812 }, reducedMotion: "no-preference" })

	test("the after panel offers the chat it came from, and plays it again", async ({ page }) => {
		test.setTimeout(90_000)
		await openPage(page, HOME)
		await page.locator("[data-action-next]").click({ timeout: READ_MS + 5_000 })
		const again = page.locator("[data-action-again]")
		await expect(again).toHaveText(dictionary.replay)
		await again.click()
		await expect(page.locator("[data-action-compare]")).toHaveAttribute(
			"data-action-stage",
			"without",
		)
		await expect(page.locator('.compare-panel[data-side="without"]')).toHaveAttribute(
			"data-motion",
			"play",
		)
		// The chat starts over: its last message is at the beginning of its own delay again.
		const last = page.locator(
			'.compare-panel[data-side="without"] .chat-message:nth-child(8) .chat-bubble',
		)
		await expect(last).toHaveCSS("opacity", "0")
	})

	test("keeps the newest message of a playing chat in view", async ({ page }) => {
		test.setTimeout(60_000)
		await openPage(page, HOME)
		const chat = page.locator('.compare-panel[data-side="without"] .compare-body')
		await expect(chat).toHaveCSS("overflow-y", "auto")
		// The chat is taller than the panel, so a reader without the script would scroll it themselves.
		await expect
			.poll(() => chat.evaluate((body) => body.scrollTop), { timeout: 20_000 })
			.toBeGreaterThan(0)
		const framed = await page.evaluate(() => {
			const body = document.querySelector('.compare-panel[data-side="without"] .compare-body')
			const messages = [...(body?.querySelectorAll(".chat-message") ?? [])]
			const shown = messages.filter(
				(message) =>
					Number.parseFloat(
						getComputedStyle(message.querySelector(".chat-bubble") ?? message).opacity,
					) > 0.5,
			)
			const newest = shown.at(-1)?.getBoundingClientRect()
			const box = body?.getBoundingClientRect()
			if (newest === undefined || box === undefined) throw new Error("no message to frame")
			return { newestBottom: Math.round(newest.bottom), boxBottom: Math.round(box.bottom) }
		})
		// The chat scrolls itself: the newest message's foot is the body's foot.
		expect(Math.abs(framed.newestBottom - framed.boxBottom)).toBeLessThanOrEqual(2)
	})
})
