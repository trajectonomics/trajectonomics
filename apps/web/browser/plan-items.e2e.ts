import { expect, test } from "@playwright/test"
import { openDemo, SCREENSHOTS } from "./demo"

// The Plan's item tabs (#703): a strip under the chart whose compact cards open the full card in the drawer.

test("the Expenses tab is selected from the address, with one compact card per expense", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base&items=expenses", { theme: "light" })

	const expenses = page.getByRole("tab", { name: /^Expenses/ })
	await expect(expenses).toHaveAttribute("aria-selected", "true")
	await expect(page.getByRole("tab", { name: /^Income/ })).toHaveAttribute("aria-selected", "false")
	const text = (await expenses.textContent()) ?? ""
	const stated = Number(/(\d+)\s*$/.exec(text)?.[1] ?? Number.NaN)
	const cards = page.locator('[role="tabpanel"] button[data-plan-item]')
	expect(stated, "the tab states its count").toBeGreaterThan(0)
	await expect(cards).toHaveCount(stated)

	const add = page.locator('[role="tabpanel"] button', { hasText: "+ Add expense" })
	await expect(add, "the Demo adds nothing").toBeDisabled()
	await expect(add).toHaveAttribute("title", /switched off in this demo/)

	await page.screenshot({
		path: `${SCREENSHOTS}/plan-items/1280-light-expenses.png`,
		fullPage: true,
	})
})

test("the tabs move by keyboard, and the address follows them", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base", { theme: "light" })

	const income = page.getByRole("tab", { name: /^Income/ })
	const expenses = page.getByRole("tab", { name: /^Expenses/ })
	const milestones = page.getByRole("tab", { name: /^Milestones/ })

	await income.focus()
	await page.keyboard.press("ArrowRight")
	await expect(expenses).toBeFocused()
	await expect(expenses).toHaveAttribute("aria-selected", "true")
	await expect(page).toHaveURL(/items=expenses/)
	const ring = await expenses.evaluate((element) => {
		const style = getComputedStyle(element)
		return { style: style.outlineStyle, offset: style.outlineOffset }
	})
	expect(ring.style, "the focused tab's ring").toBe("solid")
	// The ring sits inside the tab, so the strip's scroll box cannot clip it.
	expect(ring.offset, "the ring's inset offset").toBe("-2px")

	await page.keyboard.press("End")
	await expect(milestones).toBeFocused()
	await expect(page).toHaveURL(/items=milestones/)

	await page.keyboard.press("Home")
	await expect(income).toBeFocused()
	await expect(page).toHaveURL(/items=income/)

	// Left from the first tab wraps to the last.
	await page.keyboard.press("ArrowLeft")
	await expect(milestones).toBeFocused()
	await expect(page).toHaveURL(/items=milestones/)
})

test("a compact card opens the full card in the drawer, and focus comes back to it", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/projection/?scenario=base&items=income", { theme: "light" })

	const card = page.locator('[role="tabpanel"] button[data-plan-item]').first()
	await expect(card).toBeVisible()
	await expect(card, "the card's name holds the item's").toHaveAccessibleName(/Salary/)
	await card.click()

	const drawer = page.locator("dialog[open]")
	await expect(drawer).toBeVisible()
	// The facts the full card states, in the drawer.
	await expect(drawer.getByText("Growth", { exact: true })).toBeVisible()
	await expect(drawer.locator("dt").first()).toBeVisible()

	await page.screenshot({ path: `${SCREENSHOTS}/plan-items/1280-light-drawer.png` })

	await page.keyboard.press("Escape")
	await expect(page.locator("dialog[open]")).toHaveCount(0)
	await expect(card).toBeFocused()
})
