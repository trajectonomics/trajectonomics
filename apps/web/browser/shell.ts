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

/** The Plan menu's choices, in the order they are drawn. */
export function planItems(menu: Locator): Promise<PlanItem[]> {
	return menu.getByRole("menuitemradio").evaluateAll((items) =>
		items.map((item, index) => ({
			index,
			name: item.textContent?.trim() ?? "",
			checked: item.getAttribute("aria-checked"),
		})),
	)
}

/** Opens the plan menu with Enter, walks it with Home and End, and shuts it with Escape. */
export async function keyboardRound(page: Page, button: Locator, menu: Locator): Promise<void> {
	await button.focus()
	await page.keyboard.press("Enter")
	await expect(menu.locator('[role="menuitemradio"][aria-checked="true"]')).toBeFocused()
	await page.keyboard.press("Home")
	await expect(menu.getByRole("menuitemradio").first()).toBeFocused()
	await page.keyboard.press("End")
	await expect(menu.getByRole("menuitemradio").last()).toBeFocused()
	await page.keyboard.press("Escape")
	await expect(menu).toBeHidden()
	await expect(button).toBeFocused()
}
