import { expect, test } from "@playwright/test"
import { homeOf, openPage } from "./pages"

/** The English home: the Language does not change how the ground answers a click. */
const HOME = homeOf("en")

test.describe("the hero's ripple, with motion allowed", () => {
	test.use({ reducedMotion: "no-preference" })

	test("a click on the ground starts a ripple that clears itself", async ({ page }) => {
		await openPage(page, HOME)
		const ripple = page.locator("[data-ripple]")
		await expect(ripple).not.toHaveAttribute("data-rippling", "")
		// The corner of the hero holds no control, so the click lands on the ground.
		await page.mouse.click(40, 400)
		await expect(ripple).toHaveAttribute("data-rippling", "")
		await expect(ripple).not.toHaveAttribute("data-rippling", "", { timeout: 4_000 })
	})

	test("a click on the install command or a link makes no ripple", async ({ page }) => {
		await openPage(page, HOME)
		await page.locator("[data-install-command]").click()
		await expect(page.locator("[data-ripple]")).not.toHaveAttribute("data-rippling", "")
	})

	test("the pointer moving over the hero changes nothing", async ({ page }) => {
		await openPage(page, HOME)
		await page.mouse.move(300, 300)
		await page.mouse.move(700, 450, { steps: 10 })
		await expect(page.locator("[data-ripple]")).not.toHaveAttribute("data-rippling", "")
		await expect(page.locator("[data-pointer-glow]")).toHaveCount(0)
	})
})

test.describe("the hero's ripple, when the visitor asks for less motion", () => {
	test.use({ reducedMotion: "reduce" })

	test("a click makes no ripple", async ({ page }) => {
		await openPage(page, HOME)
		await page.mouse.click(40, 400)
		await expect(page.locator("[data-ripple]")).not.toHaveAttribute("data-rippling", "")
	})
})
