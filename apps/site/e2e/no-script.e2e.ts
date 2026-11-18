import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { COPY_PROMPT_TEXT, expectShippedTheme, focusableCount, PAGES } from "./pages"

/** The homes, which carry the Copy button and the install prompt. */
const HOMES = PAGES.filter((underTest) => underTest.status === 200)

test.use({ javaScriptEnabled: false, colorScheme: "light" })

for (const underTest of HOMES) {
	test(`${underTest.name}: the header menus still open by click without JavaScript`, async ({
		page,
	}) => {
		await page.goto(underTest.path)
		const menu = page.locator("details[data-header-menu]").first()
		const firstLink = menu.locator("a").first()
		await expect(firstLink).toBeHidden()
		await menu.locator("summary").click()
		await expect(firstLink).toBeVisible()
	})

	test(`${underTest.name}: the Copy button is out of the tab order and the prompt stays selectable`, async ({
		page,
	}) => {
		await page.goto(underTest.path)
		await expect(page.locator("[data-copy-prompt]")).toBeHidden()
		const count = await focusableCount(page)
		for (let stop = 1; stop <= count; stop++) {
			await page.keyboard.press("Tab")
			const onCopy = await page.evaluate(
				() => document.activeElement?.hasAttribute("data-copy-prompt") ?? false,
			)
			expect(onCopy, `Tab stop ${stop} never lands on the Copy button`).toBe(false)
		}
		await page.locator("[data-install-prompt]").selectText()
		expect(await page.evaluate(() => document.getSelection()?.toString() ?? "")).toBe(
			COPY_PROMPT_TEXT,
		)
	})

	test(`${underTest.name}: the hero shows its whole headline, accent included, with no script`, async ({
		page,
	}) => {
		await page.goto(underTest.path)
		const dictionary = dictionaryFor(underTest.language)
		await expect(page.locator("h1")).toHaveText(
			`${dictionary.heroHeadingPrefix} ${dictionary.heroHeadingAccent}`,
		)
		await expect(page.locator("[data-hero-accent]")).toBeVisible()
	})

	test(`${underTest.name}: the Theme the HTML ships is styled without JavaScript`, async ({
		page,
	}) => {
		await page.goto(underTest.path)
		await expectShippedTheme(page)
		const painted = await page.evaluate(() => ({
			token: getComputedStyle(document.documentElement)
				.getPropertyValue("--ds-color-background")
				.trim(),
			background: getComputedStyle(document.body).backgroundColor,
		}))
		expect(painted.token).not.toBe("")
		expect(painted.background).not.toBe("rgba(0, 0, 0, 0)")
	})
}
