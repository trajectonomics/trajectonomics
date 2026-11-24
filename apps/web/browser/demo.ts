import { expect, type Page } from "@playwright/test"

export type Theme = "light" | "dark"
export const THEMES: readonly Theme[] = ["light", "dark"]

/** Where the screenshots go. `screenshots/` is ignored by git, and CI uploads it for people to look at. */
export const SCREENSHOTS = "screenshots"

/**
 * Opens a page of the Demo (`?demo=1`) in a theme and waits until it has read the Demo snapshot and
 * drawn it. The theme is set the way a person sets it, in `localStorage` (`traj.theme`), before the
 * page's own script reads it, so the first paint is already in that theme.
 */
export async function openDemo(page: Page, path: string, theme: Theme): Promise<void> {
	await page.addInitScript((value) => localStorage.setItem("traj.theme", value), theme)
	await page.goto(`${path}?demo=1`)
	await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
	await page.waitForLoadState("networkidle")
	// The status line says "Loading the Snapshot." until the Demo snapshot has been read, and "No
	// Snapshot is loaded." when the read failed: a page checked in either state proves nothing.
	await expect(page.getByText("Loading the Snapshot.")).toHaveCount(0)
	await expect(page.getByText("No Snapshot is loaded.")).toHaveCount(0)
	await expect(page.locator("main")).toBeVisible()
	await page.evaluate(() => document.fonts.ready)
}
