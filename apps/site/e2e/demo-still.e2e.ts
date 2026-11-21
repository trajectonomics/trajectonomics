import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { homeOf, openPage } from "./pages"
import { VIEWPORTS } from "./viewports"

/** The English home, whose demo window a still reader sees whole (ADR 0022). */
const HOME = homeOf("en")
const dictionary = dictionaryFor(HOME.language)

for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
	test.describe(`the demo window with motion reduced on a ${viewportName}`, () => {
		test.use({ viewport, reducedMotion: "reduce" })

		test("shows both chats, one above the other, whole and still, with no control offered", async ({
			page,
		}) => {
			await openPage(page, HOME)
			for (const side of ["without", "with"]) {
				const chat = page.locator(`.app-chat[data-chat="${side}"]`)
				await expect(chat).toBeVisible()
				await expect(chat).not.toHaveAttribute("data-motion", /.+/)
			}
			await expect(page.locator(".app-chat .chat-message")).toHaveCount(15)
			await expect(page.locator("[data-app]")).not.toHaveAttribute("data-stage", /.+/)
			await expect(page.locator("[data-app-replay]")).toBeHidden()
			await expect(page.locator(".app-composer").first()).toBeHidden()
			await expect(page.locator("[data-app-new]")).toBeDisabled()
			await expect(page.locator("[data-app-side]")).toHaveAttribute("aria-hidden", "true")
			// The transcripts are not scroll containers here: nothing is folded behind a scrollbar.
			for (const region of await page.locator(".app-scroll").all()) {
				const scrolls = await region.evaluate((box) => box.scrollHeight > box.clientHeight)
				expect(scrolls).toBe(false)
			}
			await expect(page.locator(".app-chat").first()).toContainText(dictionary.actionConfession)
		})
	})
}
