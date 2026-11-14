import { expect, test } from "@playwright/test"
import { COPY_TEXT, focusableCount, PAGES } from "./pages"

/** The homes, which carry the Copy button and the install command. */
const HOMES = PAGES.filter((underTest) => underTest.status === 200)

test.use({ javaScriptEnabled: false, colorScheme: "dark" })

for (const underTest of HOMES) {
	test(`${underTest.name}: the Copy button is out of the tab order and the command stays selectable`, async ({
		page,
	}) => {
		await page.goto(underTest.path)
		await expect(page.locator("[data-copy-command]")).toBeHidden()
		const count = await focusableCount(page)
		for (let stop = 1; stop <= count; stop++) {
			await page.keyboard.press("Tab")
			const onCopy = await page.evaluate(
				() => document.activeElement?.hasAttribute("data-copy-command") ?? false,
			)
			expect(onCopy, `Tab stop ${stop} never lands on the Copy button`).toBe(false)
		}
		await page.locator("[data-install-command]").selectText()
		expect(await page.evaluate(() => document.getSelection()?.toString() ?? "")).toBe(COPY_TEXT)
	})

	test(`${underTest.name}: the Theme the HTML ships is styled without JavaScript`, async ({
		page,
	}) => {
		await page.goto(underTest.path)
		await expect(page.locator("html")).toHaveAttribute("data-theme", "light")
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
