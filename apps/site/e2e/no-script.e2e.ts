import { expect, test } from "@playwright/test"
import { dictionaryFor } from "../src/lib/language/languages"
import { BASE_URL } from "./base-url"
import { focusableCount } from "./controls"
import { expectShippedTheme, PAGES, visit } from "./pages"

/** The homes, whose CTA carries the Copy button and the CLI link. */
const HOMES = PAGES.filter((underTest) => underTest.status === 200)

test.use({ javaScriptEnabled: false, colorScheme: "light" })

for (const underTest of HOMES) {
	test(`${underTest.name}: the header menus still open by click without JavaScript`, async ({
		page,
	}) => {
		await visit(page, underTest)
		const menu = page.locator("details[data-header-menu]").first()
		const firstLink = menu.locator("a").first()
		await expect(firstLink).toBeHidden()
		await menu.locator("summary").click()
		await expect(firstLink).toBeVisible()
	})

	test(`${underTest.name}: the Copy button is out of the tab order and the CLI link remains`, async ({
		page,
	}) => {
		await visit(page, underTest)
		await expect(page.locator("[data-copy-prompt]")).toBeHidden()
		await expect(page.locator("[data-install-prompt]")).toBeHidden()
		await expect(page.locator("[data-install-window] a[href]")).toBeVisible()
		const count = await focusableCount(page)
		for (let stop = 1; stop <= count; stop++) {
			await page.keyboard.press("Tab")
			const onCopy = await page.evaluate(
				() => document.activeElement?.hasAttribute("data-copy-prompt") ?? false,
			)
			expect(onCopy, `Tab stop ${stop} never lands on the Copy button`).toBe(false)
		}
	})

	test(`${underTest.name}: the hero shows its whole headline, accent included, with no script`, async ({
		page,
	}) => {
		await visit(page, underTest)
		const dictionary = dictionaryFor(underTest.language)
		await expect(page.locator("h1")).toHaveText(
			`${dictionary.heroHeadingPrefix} ${dictionary.heroHeadingAccent}`,
		)
		await expect(page.locator("[data-hero-accent]")).toBeVisible()
	})

	test(`${underTest.name}: both chats are whole, one above the other, with no script`, async ({
		page,
	}) => {
		await visit(page, underTest)
		const dictionary = dictionaryFor(underTest.language)
		const alone = page.locator('.app-chat[data-chat="without"]')
		const guided = page.locator('.app-chat[data-chat="with"]')
		await expect(alone.locator(".chat-message")).toHaveCount(8)
		await expect(alone).toContainText(dictionary.actionConfession)
		await expect(alone).toContainText(dictionary.actionWithoutNote)
		await expect(guided.locator(".chat-message")).toHaveCount(7)
		await expect(guided).toContainText(dictionary.actionProvenance)
		await expect(guided).toContainText(dictionary.actionWithNote)
		// Both are laid out at once, so the second starts below the first.
		const [first, second] = await Promise.all([alone.boundingBox(), guided.boundingBox()])
		expect(second?.y ?? 0).toBeGreaterThan((first?.y ?? 0) + (first?.height ?? 0) - 1)
		// No section carries a motion state or a stage, and no control offers what cannot happen.
		await expect(page.locator("[data-motion], [data-stage], [data-hint]")).toHaveCount(0)
		await expect(page.locator("[data-app-replay]")).toBeHidden()
		for (const control of await page.locator("[data-app] button:not([hidden])").all()) {
			await expect(control).toBeDisabled()
		}
		await expect(page.locator(".app-composer").first()).toBeHidden()
		await expect(page.locator("[data-app-side]")).toHaveAttribute("aria-hidden", "true")
	})

	test(`${underTest.name}: the Theme the HTML ships is styled without JavaScript`, async ({
		page,
	}) => {
		await visit(page, underTest)
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

test("the Language menu switches and remembers with JavaScript off, at the one address", async ({
	page,
}) => {
	await page.goto("/")
	await expect(page.locator("html")).toHaveAttribute("lang", "en")
	// A first visit stores nothing, so no choice is set before the visitor makes one.
	expect((await page.context().cookies()).map((cookie) => cookie.name)).not.toContain("traj_lang")

	const menu = page.locator('details[data-header-menu]:has(a[href="/?lang=th"])').first()
	await menu.locator("summary").click()
	await page.locator('details[data-header-menu] a[href="/?lang=th"]').click()
	await expect(page.locator("html")).toHaveAttribute("lang", "th")
	expect(page.url()).toBe(`${BASE_URL}/`)

	// The next visit is Thai with no click, because the choice was stored on this origin.
	await page.goto("/")
	await expect(page.locator("html")).toHaveAttribute("lang", "th")
	expect(page.url()).toBe(`${BASE_URL}/`)
})
