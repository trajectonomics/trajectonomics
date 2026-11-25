import { fileURLToPath } from "node:url"
import { expect, type Page, test } from "@playwright/test"
import { expectShippedTheme, openPage, PAGES_UNDER_TEST } from "./pages"
import { VIEWPORTS } from "./viewports"

/** The two baselines this file names, and the viewport each one judges. The filenames are its own. */
const SNAPSHOTS = { desktop: VIEWPORTS.desktop, mobile: VIEWPORTS.phone } as const

/**
 * The one face the screenshots pin: Thai. The page serves Aleo and Azeret Mono from its build, but
 * Thai still falls through to the visitor's own face, so the pin keeps that family the same on every
 * runner. The `unicode-range` keeps it to Thai code points, so Latin renders in the page's own faces.
 */
const FONT_CSS = `
@font-face { font-family: "Visual Thai"; src: url("/e2e-fonts/NotoSansThai.ttf"); font-weight: 400; unicode-range: U+0E00-0E7F; }
/* The Theme's typography sheet names the sans stack on [data-theme], so the pin names it there too. */
html[data-theme] { font-family: "Visual Thai", ui-sans-serif, system-ui, "Segoe UI", "Leelawadee UI", Thonburi, "Noto Sans Thai", sans-serif; }
:root { --font-display: "Visual Thai", "Aleo", "Aleo Fallback", Georgia, serif; --font-meta: "Visual Thai", "Azeret Mono", "Azeret Mono Fallback", ui-monospace, SFMono-Regular, Menlo, monospace; }
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
 * The screenshots CI validates: every page on a desktop and a phone, with the device set to light.
 * That is the case the Site has to ignore ([ADR 0016]), so the one baseline set per page per viewport
 * is also the pixel proof that a light device gets the dark Theme. Motion is reduced, so the hero
 * holds the suffix the page ships and nothing animates into the snapshot. Regenerate the baselines
 * with `bun run test:visual:update` after an intended visual change, in an environment whose fallback
 * sans is the GitHub runner's DejaVu Sans: the pin above covers Thai only, so every sans glyph comes
 * from the host, and a host with another one changes them all.
 * `mcr.microsoft.com/playwright:v1.65.0-noble` (the tag for the version above) with
 * `fonts-dejavu-core` added renders them byte for byte the way the browser check does (site#42).
 */
test.describe("the built pages as screenshots", () => {
	test.use({ reducedMotion: "reduce", colorScheme: "light" })

	for (const underTest of PAGES_UNDER_TEST) {
		for (const [snapshot, viewport] of Object.entries(SNAPSHOTS)) {
			test(`${underTest.name} on ${snapshot}`, async ({ page }) => {
				await pinFonts(page)
				await page.setViewportSize(viewport)
				await openPage(page, underTest)
				await expectShippedTheme(page)
				await page.addStyleTag({ content: FONT_CSS })
				await page.evaluate(() => document.fonts.ready)
				// The Mascot's lower poses load lazily (ADR 0026); a full-page capture does not scroll, so load them first.
				await page.evaluate(() =>
					Promise.all(
						[...document.images].map((image) => {
							image.loading = "eager"
							return image.decode().catch(() => undefined)
						}),
					),
				)
				const slug = underTest.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
				await expect(page).toHaveScreenshot(`${slug}-${snapshot}.png`, {
					fullPage: true,
				})
			})
		}
	}
})
