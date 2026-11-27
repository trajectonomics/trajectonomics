import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

// A card's heading link stretches over the card. A keyboard focus must show its ring around the card,
// and the card's own figures (a compact amount carries the exact figure in its title) must stay above the link.

test("a keyboard-focused card link draws its ring around the card", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light" })

	const link = page.getByRole("heading", { level: 2, name: "Net worth" }).getByRole("link")
	await expect(link).toBeVisible()
	await link.focus()
	await page.keyboard.press("Shift+Tab")
	await page.keyboard.press("Tab")

	const ring = await link.evaluate((element) => ({
		link: getComputedStyle(element).outlineStyle,
		overlay: getComputedStyle(element, "::after").outlineStyle,
	}))
	expect(ring.overlay).toBe("solid")
})

test("an Overview card's compact amount sits above the stretched link", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light" })

	const amount = page.locator("main section [title]").first()
	await expect(amount).toHaveAttribute("title", /^\d{1,3}(?:,\d{3})*\.\d{2}$/)
	await amount.scrollIntoViewIfNeeded()
	const hit = await amount.evaluate((element) => {
		const box = element.getBoundingClientRect()
		const found = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
		return found !== null && (found === element || element.contains(found))
	})
	expect(hit, "the amount, not the card's link, is at its centre").toBe(true)
})
