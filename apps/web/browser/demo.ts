import { expect, type Page } from "@playwright/test"

/** The two themes a person can choose: each is a `data-theme` value on `<html>`. */
export type Theme = "light" | "dark"

/** Both themes, in the order the suite visits them. */
export const THEMES: readonly Theme[] = ["light", "dark"]

/** Where the screenshots go. `screenshots/` is ignored by git, and CI uploads it for people to look at. */
export const SCREENSHOTS = "screenshots"

/**
 * The one font every measurement is made in. Chromium falls back to whatever sans-serif the machine has,
 * and the Reports table's narrowest width moved between 830px and 959px with it, so a width check passed on
 * one machine and failed on another. Liberation Sans is installed by `playwright install-deps` on the CI
 * runner, so the widths in ADR 0026 and in the checks assume it.
 */
const PINNED_FONT = "Liberation Sans"

/** What a person's choices were before the page loaded. */
export interface Choices {
	/** The theme, stored the way the page stores it (`traj.theme`). */
	readonly theme: Theme
	/** Whether amounts are hidden (`traj.hideAmounts`), which swaps each figure for a mask. */
	readonly hideAmounts?: boolean
}

/**
 * Opens a page of the Demo (`?demo=1`) with a person's choices and waits until it has read the Demo
 * snapshot and drawn it. The choices are set the way a person sets them, in `localStorage`, before the page's
 * own script reads them, so the first paint is already in that theme. The font is pinned
 * ({@link PINNED_FONT}) and the call fails when it is not installed, rather than measure in another font.
 */
export async function openDemo(page: Page, path: string, choices: Choices): Promise<void> {
	await page.addInitScript(
		({ theme, hidden }) => {
			localStorage.setItem("traj.theme", theme)
			localStorage.setItem("traj.hideAmounts", hidden ? "1" : "0")
		},
		{ theme: choices.theme, hidden: choices.hideAmounts === true },
	)
	await page.goto(`${path}?demo=1`)
	await expect(page.locator("html")).toHaveAttribute("data-theme", choices.theme)
	await page.addStyleTag({ content: `html, body { font-family: "${PINNED_FONT}" !important }` })
	await page.waitForLoadState("networkidle")
	// The status line says "Loading the Snapshot." until the Demo snapshot has been read, and "No
	// Snapshot is loaded." when the read failed: a page checked in either state proves nothing.
	await expect(page.getByText("Loading the Snapshot.")).toHaveCount(0)
	await expect(page.getByText("No Snapshot is loaded.")).toHaveCount(0)
	await expect(page.locator("main")).toBeVisible()
	await page.evaluate(() => document.fonts.ready)
	expect(await pinnedFontIsInstalled(page), `${PINNED_FONT} is not installed`).toBe(true)
}

/** Whether the pinned font is installed: text in it measures differently from the monospace it would fall back to. */
function pinnedFontIsInstalled(page: Page): Promise<boolean> {
	return page.evaluate((font) => {
		const context = document.createElement("canvas").getContext("2d")
		if (context === null) return false
		const sample = "mmmmmmmmmmlli 0123456789"
		const width = (family: string) => {
			context.font = `16px ${family}`
			return context.measureText(sample).width
		}
		return width(`"${font}", monospace`) !== width("monospace")
	}, PINNED_FONT)
}
