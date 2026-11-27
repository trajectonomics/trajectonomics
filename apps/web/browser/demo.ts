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
	/** The browser's own font size, in pixels, when a check wants a larger root than the default 16px. */
	readonly rootFontSize?: number
}

/**
 * Opens a page of the Demo (`?demo=1`) with a person's choices and waits until it has read the Demo
 * snapshot and drawn it. The choices are set the way a person sets them, in `localStorage`, before the page's
 * own script reads them, so the first paint is already in that theme. The font is pinned
 * ({@link PINNED_FONT}) and the call fails when it is not installed, rather than measure in another font.
 */
export async function openDemo(page: Page, path: string, choices: Choices): Promise<void> {
	await chooseBeforeLoad(page, choices)
	// A path that already names a query keeps it: `?demo=1` joins it, and never replaces what the caller asked for.
	await page.goto(`${path}${path.includes("?") ? "&" : "?"}demo=1`)
	await settle(page, choices.theme)
}

/**
 * Sets a person's choices in `localStorage`, and the one measured font on the body, before the page's own
 * script reads them. The font is pinned here and not after the load because the diagram measures its labels
 * in that font as it draws, and a font applied later would not be the one it measured.
 */
export async function chooseBeforeLoad(page: Page, choices: Choices): Promise<void> {
	await page.addInitScript(
		({ theme, hidden, font, rootPx }) => {
			localStorage.setItem("traj.theme", theme)
			localStorage.setItem("traj.hideAmounts", hidden ? "1" : "0")
			const pin = () => {
				const root = document.documentElement
				if (root === null) return false
				if (rootPx !== null) root.style.setProperty("font-size", `${rootPx}px`, "important")
				const body = document.body
				if (body === null) return false
				body.style.setProperty("font-family", `"${font}"`, "important")
				return true
			}
			if (!pin()) {
				const observer = new MutationObserver(() => {
					if (pin()) observer.disconnect()
				})
				observer.observe(document, { childList: true, subtree: true })
			}
		},
		{
			theme: choices.theme,
			hidden: choices.hideAmounts === true,
			font: PINNED_FONT,
			rootPx: choices.rootFontSize ?? null,
		},
	)
}

/** Waits until the page has read the Demo snapshot and drawn it, in the pinned font and the theme. */
export async function settle(page: Page, theme: Theme): Promise<void> {
	await expect(page.locator("html")).toHaveAttribute("data-theme", theme)
	await page.addStyleTag({ content: `html, body { font-family: "${PINNED_FONT}" !important }` })
	await page.waitForLoadState("networkidle")
	// The status line says "Loading…" until the Demo snapshot has been read, and "No figures are
	// loaded." when the read failed: a page checked in either state proves nothing.
	await expect(page.getByText("Loading…")).toHaveCount(0)
	await expect(page.getByText("No figures are loaded.")).toHaveCount(0)
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
