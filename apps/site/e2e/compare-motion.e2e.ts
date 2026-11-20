import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { COMPARE_ALONE, COMPARE_WITH, sequenceTimeline } from "../src/lib/motion/timeline"
import { homeOf, openPage } from "./pages"

/** The English home, whose two compare panels play their exchange once (ADR 0019). */
const HOME = homeOf("en")
const dictionary = dictionaryFor(HOME.language)

/** The two panels: the side the markup names, how many messages it shows, and how long it takes. */
const PANELS = [
	{ side: "without", messages: 8, totalMs: sequenceTimeline(COMPARE_ALONE).totalMs },
	{ side: "with", messages: 7, totalMs: sequenceTimeline(COMPARE_WITH).totalMs },
] as const

/** The selector of one message's bubble, one-based as CSS counts. */
function bubble(panel: string, index: number): string {
	return `.compare-panel[data-side="${panel}"] .chat-message:nth-child(${index + 1}) .chat-bubble`
}

test.describe("the compare panels with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	for (const panel of PANELS) {
		test(`${panel.side}: plays its beats in order and settles with every message shown`, async ({
			page,
		}) => {
			await openPage(page, HOME)
			const root = page.locator(`.compare-panel[data-side="${panel.side}"]`)
			// The comparison now sits in the hero, so a panel already in view plays on load.
			await expect(root).toHaveAttribute("data-motion", "play")
			await expect(root.locator(".chat-message")).toHaveCount(panel.messages)
			// The last message has not landed yet: its beat is still ahead of the first one.
			expect(
				await page
					.locator(bubble(panel.side, panel.messages - 1))
					.evaluate((element) => getComputedStyle(element).opacity),
			).toBe("0")

			// The last beat lands inside the sequence's bound, and the panel holds its settled frame.
			await expect(page.locator(bubble(panel.side, panel.messages - 1))).toHaveCSS("opacity", "1", {
				timeout: panel.totalMs + 2_000,
			})
			for (let index = 0; index < panel.messages; index++) {
				const message = page.locator(bubble(panel.side, index))
				await expect(message).toBeVisible()
				expect(
					await message.evaluate((element) => getComputedStyle(element).opacity),
					`message ${index + 1} is fully shown`,
				).toBe("1")
			}
		})
	}

	test("scrolling away and back does not replay a panel that settled", async ({ page }) => {
		await openPage(page, HOME)
		const root = page.locator('.compare-panel[data-side="without"]')
		await root.scrollIntoViewIfNeeded()
		await expect(root).toHaveAttribute("data-motion", "play")
		const last = page.locator(bubble("without", 7))
		await expect(last).toHaveCSS("opacity", "1", {
			timeout: sequenceTimeline(COMPARE_ALONE).totalMs + 2_000,
		})
		await page.locator("h1").scrollIntoViewIfNeeded()
		await root.scrollIntoViewIfNeeded()
		// A replay would start the first beat again, so the last message would be invisible: it is not.
		await page.waitForTimeout(600)
		await expect(last).toHaveCSS("opacity", "1")
	})

	test("Replay plays its own section again, and only its own", async ({ page }) => {
		await openPage(page, HOME)
		const replay = page.locator("[data-replay]").first()
		await expect(replay).toHaveText(dictionary.replay)
		await replay.click()
		await expect(page.locator('.compare-panel[data-side="without"]')).toHaveAttribute(
			"data-motion",
			"play",
		)
		// The first beat starts over, so the last message is back at the start of its own delay.
		await expect(page.locator(bubble("without", 7))).toHaveCSS("opacity", "0")
		// Replay is one section's: the flow below it does not play.
		await expect(page.locator(".how")).not.toHaveAttribute("data-motion", "play")
	})
})

test.describe("the compare panels with motion reduced", () => {
	test.use({ reducedMotion: "reduce" })

	test("shows the whole exchange at once, with nothing moving and with the control absent", async ({
		page,
	}) => {
		await openPage(page, HOME)
		for (const panel of PANELS) {
			const root = page.locator(`.compare-panel[data-side="${panel.side}"]`)
			await expect(root).not.toHaveAttribute("data-motion", "play")
			await expect(root.locator(".chat-message")).toHaveCount(panel.messages)
			for (let index = 0; index < panel.messages; index++) {
				await expect(page.locator(bubble(panel.side, index))).toBeVisible()
			}
		}
		// The decorative dots rest invisible, and the Replay control is not rendered for a reader.
		await expect(page.locator(".chat-thinking").first()).toHaveCSS("opacity", "0")
		await expect(page.locator("[data-replay]").first()).toBeHidden()
	})
})
