import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"
import { menuOf, outlineStyle, PHONE_PX, planMenuItems, tabTo, WIDE_PX } from "./shell"

// The shell's keyboard and focus rules (web #701): the plan menu walks every item, picks with Enter, and
// shuts on Tab or a click outside without losing focus; a nav link and a group heading draw a focus ring.

test("the plan menu walks every item, picks with Enter, and shuts on Tab and on a click outside", async ({
	page,
}) => {
	await page.setViewportSize(WIDE_PX)
	await openDemo(page, "/net-worth/", { theme: "light" })
	const button = page.getByRole("button", { name: /^Plan: .+\. Change plan$/ })
	const menu = page.getByRole("menu", { name: "Plans" })

	await button.click()
	await expect(menu).toBeVisible()
	const items = planMenuItems(menu)
	const count = await items.count()

	// "All plans" is the last item, and ArrowUp from it reaches the plan above it, not the second-last plan.
	await page.keyboard.press("End")
	await expect(menu.getByRole("menuitem", { name: "All plans" })).toBeFocused()
	await page.keyboard.press("ArrowUp")
	await expect(items.nth(count - 2)).toBeFocused()

	// Enter on a plan that is not the one on screen switches the page, shuts the menu and returns focus.
	const unchecked = menu.getByRole("menuitemradio", { checked: false }).first()
	await unchecked.focus()
	const name = ((await unchecked.textContent()) ?? "").trim()
	await page.keyboard.press("Enter")
	await expect(menu).toBeHidden()
	expect(new URL(page.url()).searchParams.get("scenario")).toBe(name)
	await expect(button).toBeFocused()

	// Tab moves focus out of the menu by itself, and the menu shuts behind it.
	await button.click()
	await expect(menu).toBeVisible()
	await page.keyboard.press("Tab")
	await expect(menu).toBeHidden()
	// The page's own heading is inside `main` but under a `<header>`, so the check is that focus stands in `main`.
	await expect(page.locator("main :focus")).toHaveCount(1)

	// A click on blank content shuts the menu, and the button takes focus back from the page body.
	await button.click()
	await expect(menu).toBeVisible()
	await page.locator("footer p").click()
	await expect(menu).toBeHidden()
	await expect(button).toBeFocused()
})

test("a nav link and a group heading draw a focus ring when the keyboard reaches them", async ({
	page,
}) => {
	await page.setViewportSize(WIDE_PX)
	await openDemo(page, "/net-worth/", { theme: "light" })
	const nav = page.getByRole("navigation", { name: "Pages" })
	const link = nav.getByRole("link", { name: "Net worth", exact: true })
	const heading = nav.getByRole("button", { name: "Plan", exact: true })

	await tabTo(page, link)
	expect(await outlineStyle(link), "the nav link's focus ring").toBe("solid")

	await tabTo(page, heading)
	expect(await outlineStyle(heading), "the group heading's focus ring").toBe("solid")
})

test("photographs the open menu drawer and the open plan menu at a phone's width", async ({
	page,
}) => {
	await page.setViewportSize(PHONE_PX)
	await openDemo(page, "/net-worth/", { theme: "light" })
	const { button, drawer } = menuOf(page)
	await button.click()
	await expect(drawer).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOTS}/shell/360/nav-drawer.png` })

	await page.keyboard.press("Escape")
	await expect(drawer).toBeHidden()
	await page.getByRole("button", { name: /^Plan: .+\. Change plan$/ }).click()
	await expect(page.getByRole("menu", { name: "Plans" })).toBeVisible()
	await page.screenshot({ path: `${SCREENSHOTS}/shell/360/plan-menu.png` })
})
