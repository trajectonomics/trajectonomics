import { expect, test } from "@playwright/test"
import { BASE_URL } from "./base-url"
import { fillHolder } from "./guided-plan"

// The household step keeps each person's own answers (web ADR 0031): a Remove takes focus to the person after it, or
// to "Add partner" when none follows, and a person nobody touched never shows the alert of the person removed before it.
test("Remove moves focus on, and an untouched person keeps no alert", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await page.goto(`${BASE_URL}/plans/new/?demo=1`)
	await fillHolder(page)
	await page.getByRole("button", { name: "Add partner" }).click()
	await page.getByRole("button", { name: "Add dependent" }).click()

	// Touch the partner's empty Name, so its own problem shows, and leave the dependent that follows untouched.
	const partner = page.getByLabel("Name").nth(1)
	await partner.click()
	await partner.blur()
	await expect(page.getByRole("alert")).toHaveCount(1)

	await page.getByRole("button", { name: "Remove Your partner" }).click()
	const dependent = page.getByLabel("Name").nth(1)
	await expect(dependent).toBeFocused()
	await expect(page.getByRole("alert")).toHaveCount(0)

	await dependent.blur()
	await page.getByRole("button", { name: "Remove Dependent" }).click()
	await expect(page.getByRole("button", { name: "Add partner" })).toBeFocused()
})
