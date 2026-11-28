import { expect, type Page, test } from "@playwright/test"
import { contrast, readInk } from "./colour"
import { openDemo, SCREENSHOTS, THEMES, type Theme } from "./demo"
import { measureOverflow } from "./fit"

// Print media on the pages a person prints (#373). The page asks for A4 landscape with 12mm margins
// (`@page` in src/styles/global.css), so the paper holds 273mm: 1032 CSS px. A table must fit it with no
// scroll box, the page must be black on white whichever theme the screen shows, and the theme must make no
// difference to the surfaces that are printed. A semantic colour (a warning's orange) may differ by theme,
// so text is checked for contrast on its own background instead.
const PRINTED = ["/", "/reports/", "/projection/years/", "/cash-flow/"] as const
const A4_LANDSCAPE_CONTENT_PX = Math.floor(((297 - 2 * 12) / 25.4) * 96)
/** WCAG's floor for large text and graphics, a deliberately low bar: a dark theme's light text on white is near 1. */
const MIN_CONTRAST = 3

/** Each element's background and border colours on paper, in document order: the surfaces a printer would ink. */
function paperSurfaces(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		[...document.querySelectorAll("html, body, body *")]
			.filter((element) => !(element instanceof SVGElement))
			.map((element) => {
				const style = getComputedStyle(element)
				const [r, g, b] = style.borderTopColor.match(/\d+/g) ?? []
				// A semantic colour (a warning's orange) may differ by theme, so only a grey border is a surface.
				const grey = r === g && g === b && Number.parseFloat(style.borderTopWidth) > 0
				return `${element.tagName} ${style.backgroundColor} ${grey ? style.borderTopColor : "none"}`
			}),
	)
}

/** The text that would print with too little contrast against what is behind it, in words. */
async function faintText(page: Page): Promise<string[]> {
	return (await readInk(page))
		.filter((ink) => contrast(ink.text, ink.behind) < MIN_CONTRAST)
		.map((ink) => `${ink.label} rgb(${ink.text}) on rgb(${ink.behind})`)
}

for (const theme of THEMES) {
	for (const path of PRINTED) {
		test(`${path} prints on A4 in black on white, from the ${theme} theme`, async ({ page }) => {
			await openDemo(page, path, { theme })
			await page.emulateMedia({ media: "print" })
			await page.setViewportSize({ width: A4_LANDSCAPE_CONTENT_PX, height: 800 })
			const name = path === "/" ? "home" : path.replaceAll("/", "")
			await page.screenshot({ path: `${SCREENSHOTS}/print/${theme}/${name}.png`, fullPage: true })

			// The page opens with the plan, the As-of date and the terms.
			await expect(page.locator("[data-print-header]")).toBeVisible()

			// Nothing sticks out of the paper: not a table, and not the page.
			const fit = await measureOverflow(page, false)
			expect(fit.tables, "tables wider than the paper").toEqual([])
			expect(fit.scrollWidth, "the printed width").toBeLessThanOrEqual(fit.innerWidth)

			// Black on white, even from the dark theme.
			const ground = await page.evaluate(() => ({
				html: getComputedStyle(document.documentElement).backgroundColor,
				body: getComputedStyle(document.body).backgroundColor,
				text: getComputedStyle(document.body).color,
			}))
			expect(ground).toEqual({
				html: "rgb(255, 255, 255)",
				body: "rgb(255, 255, 255)",
				text: "rgb(0, 0, 0)",
			})
			expect(await faintText(page), "text too faint to read on paper").toEqual([])

			// The other theme prints exactly the same surfaces.
			const printed = await paperSurfaces(page)
			const other: Theme = theme === "light" ? "dark" : "light"
			await page.evaluate((value) => {
				document.documentElement.dataset["theme"] = value
			}, other)
			expect(await paperSurfaces(page)).toEqual(printed)
		})
	}
}

test("a closed Details prints its contents, so the paper keeps the commands and the hashes", async ({
	page,
}) => {
	await openDemo(page, "/projection/years/", { theme: "light" })
	await page.emulateMedia({ media: "print" })
	const details = page.locator("details[data-provenance]").first()
	await expect(details.locator("summary")).toHaveText("Details")
	const content = await details.evaluate(
		(element) => getComputedStyle(element, "::details-content").contentVisibility,
	)
	expect(content, "a closed Details' content on paper").toBe("visible")
	const command = details.locator("pre").first()
	expect(
		await command.evaluate((element) => element.getBoundingClientRect().height),
	).toBeGreaterThan(0)
})

test("any other closed disclosure stays closed on paper, so a long table does not print", async ({
	page,
}) => {
	await openDemo(page, "/net-worth/", { theme: "light" })
	await page.emulateMedia({ media: "print" })
	const table = page.locator("details:not([data-provenance])", {
		hasText: "Month-end figures as a table",
	})
	await expect(table).toHaveCount(1)
	const content = await table.evaluate(
		(element) => getComputedStyle(element, "::details-content").contentVisibility,
	)
	expect(content, "a closed table disclosure on paper").not.toBe("visible")
})
