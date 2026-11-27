import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

// The top bar (web #698): one title in the page, icon-only display actions, the As-of date as a chip, and
// the CLI version only in the Display options drawer.
test("the top bar has one page title, icon-only actions and the As-of date", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })

	await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
	await expect(page.locator("header h1 + p")).toHaveCount(0)
	expect(await page.getByRole("banner").textContent()).not.toContain("Net worth")

	const display = page.getByRole("button", { name: "Display options" })
	await expect(display).toHaveText("")
	await expect(display).toHaveAttribute("title", "Display options")

	const hide = page.getByRole("button", { name: "Hide amounts" })
	await expect(hide).toHaveText("")
	await expect(hide).toHaveAttribute("aria-pressed", "false")

	await expect(page.getByTitle(/^Figures as of \d{1,2} [A-Z][a-z]{2} \d{4}$/)).toBeVisible()
	expect(await page.getByRole("banner").textContent()).not.toMatch(/traj \d/)
	expect(await page.locator("main").textContent()).not.toMatch(/traj \d/)

	await display.click()
	await expect(page.getByRole("dialog").getByText(/^Read by traj /)).toBeVisible()
})

test("Hide amounts masks the page's figures and stays on in Display options", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })

	const hide = page.getByRole("button", { name: "Hide amounts" })
	await expect(page.locator("main").getByText("amount hidden")).toHaveCount(0)
	await hide.click()
	await expect(hide).toHaveAttribute("aria-pressed", "true")
	await expect(page.locator("main").getByText("amount hidden").first()).toBeAttached()
	await expect(page.locator("main").getByText("•••••").first()).toBeVisible()

	await page.getByRole("button", { name: "Display options" }).click()
	await expect(
		page.getByRole("dialog").getByRole("button", { name: "Hide amounts" }),
	).toHaveAttribute("aria-pressed", "true")
})

test("the top bar's icon buttons show a focus ring to a keyboard", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })
	for (const name of ["Hide amounts", "Display options"]) {
		const button = page.getByRole("button", { name }).first()
		await button.focus()
		await page.keyboard.press("Shift+Tab")
		await page.keyboard.press("Tab")
		const style = await button.evaluate((element) => getComputedStyle(element).outlineStyle)
		expect(style, name).not.toBe("none")
	}
})
