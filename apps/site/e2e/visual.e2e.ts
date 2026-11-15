import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"
import { expectTheme, openPage, PAGES, THEMES } from "./pages"

/** The viewports the screenshots cover: the desktop the checks run at, and a phone. */
const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	mobile: { width: 390, height: 844 },
} as const

/**
 * The fonts the screenshots render with. The Site ships no web fonts (ADR 0003), so a snapshot would
 * otherwise depend on the fonts a runner happens to have installed; the test pins its own instead.
 */
const FONT_CSS = `
@font-face { font-family: "Visual Sans"; src: url("/e2e-fonts/LiberationSans-Regular.ttf"); font-weight: 400; }
@font-face { font-family: "Visual Sans"; src: url("/e2e-fonts/LiberationSans-Bold.ttf"); font-weight: 700; }
@font-face { font-family: "Visual Serif"; src: url("/e2e-fonts/LiberationSerif-Regular.ttf"); font-weight: 300 400; }
@font-face { font-family: "Visual Thai"; src: url("/e2e-fonts/NotoSansThai.ttf"); font-weight: 400; }
@font-face { font-family: "Visual Mono"; src: url("/e2e-fonts/LiberationMono-Regular.ttf"); font-weight: 400; }
/* The Theme's typography sheet names the family on [data-theme], so the pin names it there too. */
html[data-theme] { font-family: "Visual Sans", "Visual Thai", sans-serif; }
:root { --font-display: "Visual Serif", "Visual Thai", serif; --font-meta: "Visual Mono", "Visual Thai", monospace; }
.font-mono, code, pre, kbd, samp { font-family: "Visual Mono", "Visual Thai", monospace; }
`

/** Serve the pinned fonts from `e2e/fonts/`, so every runner renders the snapshots alike. */
async function pinFonts(page: Page): Promise<void> {
	await page.route("**/e2e-fonts/*", (route) => {
		const name = route.request().url().split("/").pop() ?? ""
		const fonts = fileURLToPath(new URL("./fonts", import.meta.url))
		return route.fulfill({ path: `${fonts}/${name}`, contentType: "font/ttf" })
	})
}

/**
 * The screenshots CI validates: every page in every Theme on a desktop and a phone. Motion is
 * reduced, so the hero holds the suffix the page ships and nothing animates into the snapshot.
 * Regenerate the baselines with `bun run test:visual:update` after an intended visual change.
 */
test.describe("the built pages as screenshots", () => {
	test.use({ reducedMotion: "reduce" })

	for (const underTest of PAGES) {
		for (const theme of THEMES) {
			test.describe(`in the ${theme} Theme`, () => {
				test.use({ colorScheme: theme })

				for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
					test(`${underTest.name} on ${viewportName}`, async ({ page }) => {
						await pinFonts(page)
						await page.setViewportSize(viewport)
						await openPage(page, underTest)
						await expectTheme(page, theme)
						await page.addStyleTag({ content: FONT_CSS })
						await page.evaluate(() => document.fonts.ready)
						const slug = underTest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
						await expect(page).toHaveScreenshot(`${slug}-${theme}-${viewportName}.png`, {
							fullPage: true,
						})
					})
				}
			})
		}
	}
})
