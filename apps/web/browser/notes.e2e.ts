import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { visibleText } from "./visible-text"

// The focus point's notes chip opens the first note it counts on the FI page. The address keeps the plan
// it named, the top bar is sticky so the note must land below it, and the note's own figures stay on the
// FI page rather than on the Overview.
test("the notes chip opens its note on the FI page, below the sticky header", async ({ page }) => {
	const viewportHeight = 800
	await page.setViewportSize({ width: 1280, height: viewportHeight })
	await openDemo(page, "/?scenario=separate", { theme: "light" })

	expect(await visibleText(page), "the note's money on the Overview").not.toContain("29603.80")
	const chip = page.getByRole("link", { name: "1 thing to check" })
	await expect(chip).toBeVisible()
	await chip.click()
	await expect(page).toHaveURL(/\/fi\/\?scenario=separate&demo=1#note-[0-9a-f]+-\d+$/)

	const hash = new URL(page.url()).hash.slice(1)
	const note = page.locator(`li[id="${hash}"]`)
	await expect(note).toBeVisible()
	await expect(note).toContainText("29603.80")
	const header = await page.locator("header").first().boundingBox()
	const box = await note.boundingBox()
	expect(header, "the sticky header").not.toBeNull()
	expect(box, "the note's box").not.toBeNull()
	if (header === null || box === null) return

	expect(box.y, "the note starts below the header").toBeGreaterThanOrEqual(header.y + header.height)
	expect(box.y + box.height, "the note is in the viewport").toBeLessThanOrEqual(viewportHeight)
})
