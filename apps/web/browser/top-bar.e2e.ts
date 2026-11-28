import { expect, test } from "@playwright/test"
import { openDemo, settle } from "./demo"
import { outlineStyle, tabTo } from "./shell"

// The top bar (web #927): the menu button and the plan switcher only. Display settings live on Settings → Display,
// and the As-of date is stated by the pages that read it.
test("the top bar holds only the menu button and the plan switcher", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })

	await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
	await expect(page.locator("header h1 + p")).toHaveCount(0)
	expect(await page.getByRole("banner").textContent()).not.toContain("Net worth")

	await expect(page.getByRole("button", { name: /^Plan: .+\. Change plan$/ })).toBeVisible()
	await expect(page.getByRole("button", { name: "Hide amounts" })).toHaveCount(0)
	await expect(page.getByRole("button", { name: "Display options" })).toHaveCount(0)
	await expect(page.getByTitle(/^Figures as of /)).toHaveCount(0)
	expect(await page.getByRole("banner").textContent()).not.toMatch(/traj \d/)
})

test("the plan button shows a focus ring to a keyboard", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })
	const button = page.getByRole("button", { name: /^Plan: .+\. Change plan$/ })
	await button.focus()
	await page.keyboard.press("Shift+Tab")
	await page.keyboard.press("Tab")
	const style = await button.evaluate((element) => getComputedStyle(element).outlineStyle)
	expect(style).toBe("solid")
})

test("the Theme switch draws a focus ring to a keyboard", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/settings/display/", { theme: "light" })
	const dark = page.getByRole("button", { name: "Dark theme" })
	await tabTo(page, dark)
	expect(await outlineStyle(dark), "the Theme switch's focus ring").toBe("solid")
})

test("Settings → Display offers the Theme switch and keeps the choice", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/settings/display/", { theme: "light" })
	const dark = page.getByRole("button", { name: "Dark theme" })
	await expect(dark).toHaveAttribute("aria-pressed", "false")

	await dark.click()
	await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
	await expect(dark).toHaveAttribute("aria-pressed", "true")
	// The choice is a preference, stored where the next load reads it.
	expect(await page.evaluate(() => localStorage.getItem("traj.theme")), "the stored theme").toBe(
		"dark",
	)

	// `openDemo`'s own script stores light before the page's script runs, so this load states light: the page reads
	// the theme in storage either way, and the switch states the theme it read.
	await page.goto("/settings/display/?demo=1")
	await settle(page, "light")
	await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
		"aria-pressed",
		"false",
	)
})

test("a stored Hide amounts is ignored", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/cash-flow/", { theme: "light", hideAmounts: true })
	await expect(page.locator("[data-flow-amount]").first()).toBeVisible()
	await expect(page.getByText("amount hidden")).toHaveCount(0)
})
