import { expect, type Locator, type Page } from "@playwright/test"

/** The shell checks' two widths: a phone, where the menu is a drawer, and a desktop, where it is a sidebar. */
export const PHONE_PX = { width: 360, height: 800 }
export const WIDE_PX = { width: 1280, height: 800 }

/** The top bar's menu button, and the drawer it opens. */
export function menuOf(page: Page): { button: Locator; drawer: Locator } {
	return {
		button: page.locator('button[aria-controls="page-menu"]'),
		drawer: page.locator("#page-menu"),
	}
}

/** One choice of the open Plan menu: its place, its name, and the `aria-checked` it states. */
export interface PlanItem {
	readonly index: number
	readonly name: string
	readonly checked: string | null
}

/** The Plan menu's plan choices, in the order they are drawn. */
export function planItems(menu: Locator): Promise<PlanItem[]> {
	return menu.getByRole("menuitemradio").evaluateAll((items) =>
		items.map((item, index) => ({
			index,
			name: item.textContent?.trim() ?? "",
			checked: item.getAttribute("aria-checked"),
		})),
	)
}

/** Every item of the open Plan menu, the plans and "All plans" and "New plan" alike, in the order they are drawn. */
export function planMenuItems(menu: Locator): Locator {
	return menu.locator('[role^="menuitem"]')
}

/** The place of the focused item among a menu's items, or -1 when the focus is elsewhere. */
function focusedIndex(items: Locator): Promise<number> {
	return items.evaluateAll((all) => all.indexOf(document.activeElement as HTMLElement))
}

/**
 * Opens the plan menu with Enter, walks every item with ArrowDown, ArrowUp, Home and End (checking the
 * place focus reaches each time), and shuts it with Escape.
 */
export async function keyboardRound(page: Page, button: Locator, menu: Locator): Promise<void> {
	await button.focus()
	await page.keyboard.press("Enter")
	await expect(menu).toBeVisible()
	await expect(menu.locator('[role="menuitemradio"][aria-checked="true"]')).toBeFocused()

	const items = planMenuItems(menu)
	const count = await items.count()
	expect(count, "the menu's items").toBeGreaterThan(1)

	let index = await focusedIndex(items)
	expect(index, "the checked plan's place").toBeGreaterThanOrEqual(0)

	await page.keyboard.press("ArrowDown")
	index = (index + 1) % count
	await expect(items.nth(index)).toBeFocused()

	await page.keyboard.press("ArrowUp")
	index = (index - 1 + count) % count
	await expect(items.nth(index)).toBeFocused()

	await page.keyboard.press("End")
	await expect(items.nth(count - 1)).toBeFocused()

	await page.keyboard.press("Home")
	await expect(items.nth(0)).toBeFocused()

	// The ends wrap: up from the first item reaches the last, and down from the last the first.
	await page.keyboard.press("ArrowUp")
	await expect(items.nth(count - 1)).toBeFocused()
	await page.keyboard.press("ArrowDown")
	await expect(items.nth(0)).toBeFocused()

	await page.keyboard.press("Escape")
	await expect(menu).toBeHidden()
	await expect(button).toBeFocused()
}

/** Presses Tab until the target holds focus, so `:focus-visible` matches as it does for a keyboard reader. */
export async function tabTo(page: Page, target: Locator, limit = 40): Promise<void> {
	for (let press = 0; press < limit; press++) {
		await page.keyboard.press("Tab")
		if (await target.evaluate((element) => element === document.activeElement)) return
	}
	throw new Error(`Tab did not reach ${await target.evaluate((element) => element.outerHTML)}`)
}

/** The outline a control draws now, as the browser computes it. */
export function outlineStyle(target: Locator): Promise<string> {
	return target.evaluate((element) => getComputedStyle(element).outlineStyle)
}
