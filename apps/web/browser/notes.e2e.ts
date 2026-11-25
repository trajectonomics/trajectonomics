import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

// Home's "thing to check" links to its note on the FI page. The top bar is sticky, so a note that
// scrolls to the top of the window would sit under it: the link must leave the note clear of the header.
test("a warning link scrolls its note below the sticky header", async ({ page }) => {
	const viewportHeight = 800
	await page.setViewportSize({ width: 1280, height: viewportHeight })
	await openDemo(page, "/", { theme: "light" })

	const link = page.getByRole("link", { name: "Open Note 1 on the FI date page" })
	await expect(link).toBeVisible()
	await link.click()
	await expect(page).toHaveURL(/\/fi\/.*#note-[0-9a-f]+-\d+$/)

	const hash = new URL(page.url()).hash.slice(1)
	const note = page.locator(`li[id="${hash}"]`)
	await expect(note).toBeVisible()
	const header = await page.locator("header").first().boundingBox()
	const box = await note.boundingBox()
	expect(header, "the sticky header").not.toBeNull()
	expect(box, "the note's box").not.toBeNull()
	if (header === null || box === null) return

	expect(box.y, "the note starts below the header").toBeGreaterThanOrEqual(header.y + header.height)
	expect(box.y + box.height, "the note is in the viewport").toBeLessThanOrEqual(viewportHeight)
})
