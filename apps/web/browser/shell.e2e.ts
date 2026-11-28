import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { keyboardRound, menuOf, PHONE_PX, planItems, WIDE_PX } from "./shell"

// The shell at a phone and at a desktop (web #701): the menu drawer's four ways to shut, the drawer's
// state across a width change, and the one-button plan switcher.

test.describe("the menu drawer", () => {
	for (const how of ["a nav link", "the close button", "the backdrop", "Escape"]) {
		test(`opens with the menu button and shuts with ${how}, returning focus`, async ({ page }) => {
			await page.setViewportSize(PHONE_PX)
			await openDemo(page, "/net-worth/", { theme: "light" })
			const { button, drawer } = menuOf(page)
			await expect(drawer).toBeHidden()

			await button.click()
			await expect(drawer).toBeVisible()

			if (how === "a nav link") {
				await drawer.getByRole("link", { name: "Overview", exact: true }).click()
			} else if (how === "the close button") {
				await drawer.getByRole("button", { name: "Close the menu" }).click()
			} else if (how === "the backdrop") {
				// The drawer is 288px wide, so a press at 340px is on the backdrop behind it.
				await page.mouse.click(340, 500)
			} else {
				await page.keyboard.press("Escape")
			}

			await expect(drawer).toBeHidden()
			await expect(button).toHaveAttribute("aria-expanded", "false")
			await expect(button).toBeFocused()
		})
	}

	test("stays shut when the screen widens and narrows, and a drawer opened on a phone shuts as it widens", async ({
		page,
	}) => {
		await page.setViewportSize(PHONE_PX)
		await openDemo(page, "/net-worth/", { theme: "light" })
		const { button, drawer } = menuOf(page)

		await page.setViewportSize(WIDE_PX)
		await expect(drawer).toBeVisible()
		await expect(button).toBeHidden()
		await page.setViewportSize(PHONE_PX)
		await expect(drawer).toBeHidden()
		await expect(button).toBeVisible()

		await button.click()
		await expect(drawer).toBeVisible()
		await page.setViewportSize(WIDE_PX)
		await expect(button).toHaveAttribute("aria-expanded", "false")
		await page.setViewportSize(PHONE_PX)
		await expect(drawer).toBeHidden()
	})
})

test("the top bar's plan button picks a plan, and keeps its keyboard in the menu", async ({
	page,
}) => {
	await page.setViewportSize(WIDE_PX)
	await openDemo(page, "/net-worth/", { theme: "light" })
	const button = page.getByRole("button", { name: /^Plan: .+\. Change plan$/ })
	const menu = page.getByRole("menu", { name: "Plans" })

	// The button opens the menu with the plan on screen focused, which is where the arrow keys set out from.
	await button.click()
	await expect(menu).toBeVisible()
	await expect(menu.locator('[role="menuitemradio"][aria-checked="true"]')).toBeFocused()

	const items = await planItems(menu)
	const other = items.find((item) => item.checked === "false")
	expect(other, "the Demo holds a second plan").toBeDefined()
	if (other === undefined) return
	await menu.getByRole("menuitemradio").nth(other.index).click()

	await expect(menu).toBeHidden()
	expect(new URL(page.url()).searchParams.get("scenario")).toBe(other.name)
	await expect(button).toHaveAccessibleName(`Plan: ${other.name}. Change plan`)

	await button.click()
	const after = await planItems(menu)
	const checkedNow = after.filter((item) => item.checked === "true")
	expect(checkedNow.map((item) => item.index)).toEqual([other.index])
	expect(after.find((item) => item.checked === "false")?.name).toBe(
		items.find((item) => item.checked === "true")?.name ?? "",
	)
	await page.keyboard.press("Escape")
	await expect(menu).toBeHidden()
	await expect(button).toBeFocused()

	await keyboardRound(page, button, menu)
})

test("a page that left the navigation marks the Plan entry as the current page", async ({
	page,
}) => {
	await page.setViewportSize(WIDE_PX)
	await openDemo(page, "/income/", { theme: "light" })
	const nav = page.getByRole("navigation", { name: "Pages" })
	const plan = nav.getByRole("link", { name: "Plan", exact: true })
	await expect(plan).toHaveAttribute("aria-current", "page")
	await expect(nav.locator('[aria-current="page"]')).toHaveCount(1)
})
