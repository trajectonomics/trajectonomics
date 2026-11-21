import { expect, test } from "@playwright/test"
import { HINT_MS, typing } from "../src/lib/motion/timeline"
import { DEMO_SKILL_COMMAND } from "../src/lib/site"
import { ALONE_MS, bubble, dictionary, HOME, KEYS, stage, WITH_MS } from "./demo"
import { openPage } from "./pages"

test.describe("the demo window with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	test("types the prompt into the composer, sends it, then plays the chat to its last message", async ({
		page,
	}) => {
		test.setTimeout(60_000)
		await openPage(page, HOME)
		await expect(stage(page)).toHaveAttribute("data-stage", "without")
		const chat = page.locator('.app-chat[data-chat="without"]')
		await expect(chat).toHaveAttribute("data-motion", "play")
		const typed = chat.locator(".app-typed")
		// The prompt is on screen while it is typed, and the first message is not yet there.
		await expect(typed).toHaveCSS("opacity", "1", { timeout: 2_000 })
		await expect(page.locator(bubble("without", 0))).toHaveCSS("opacity", "0")
		// Once it is sent the composer is empty again and the message has landed.
		await expect
			.poll(
				async () => Number.parseFloat(await typed.evaluate((el) => getComputedStyle(el).opacity)),
				{
					timeout: typing(KEYS.without).sentMs + 2_000,
				},
			)
			.toBeLessThan(0.01)
		await expect(page.locator(bubble("without", 0))).toHaveCSS("opacity", "1", { timeout: 2_000 })
		// The chat ends inside its bound with every message shown.
		await expect(page.locator(bubble("without", 7))).toHaveCSS("opacity", "1", {
			timeout: ALONE_MS + 2_000,
		})
		await expect(chat.locator(".app-verdict")).toHaveCSS("opacity", "1")
	})

	test("presses New chat itself once the first chat has been read, and plays the chat with the skill", async ({
		page,
	}) => {
		test.setTimeout(90_000)
		await openPage(page, HOME)
		// The window asks for New chat first, and then does it for the visitor.
		await expect(stage(page)).toHaveAttribute("data-hint", "", { timeout: ALONE_MS + 3_000 })
		await expect(page.locator("[data-app-new]")).toBeVisible()
		await expect(stage(page)).toHaveAttribute("data-stage", "with", { timeout: HINT_MS + 3_000 })
		const guided = page.locator('.app-chat[data-chat="with"]')
		await expect(guided).toHaveAttribute("data-motion", "play")
		await expect(page.locator('.app-chat[data-chat="without"]')).toBeHidden()
		await expect(page.locator('[data-app-chat="with"]')).toHaveAttribute("aria-current", "true")
		await expect(page.locator('[data-app-chat="without"]')).toHaveAttribute("aria-current", "false")
		// The skill's command is typed ahead of the question, and the chat settles on the answer.
		await expect(guided.locator(".app-typed")).toContainText(DEMO_SKILL_COMMAND)
		await expect(page.locator(bubble("with", 6))).toHaveCSS("opacity", "1", {
			timeout: WITH_MS + 2_000,
		})
		await expect(guided).not.toHaveAttribute("data-motion", "play", { timeout: 3_000 })
		await expect(guided).toContainText(dictionary.actionProvenance)
	})
})
