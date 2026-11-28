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

	test(`${underTest.name}: the hero's live window is the Dashboard at 100% from <noscript>, with no start link, and offers no control that cannot work`, async ({
		page,
	}) => {
		await visit(page, underTest)
		const dictionary = dictionaryFor(underTest.language)
		const zoom = page.locator("[data-live] .live-zoom button")
		await expect(zoom).toHaveCount(3)
		for (const button of await zoom.all()) await expect(button).toBeDisabled()
		await expect(page.locator("[data-live-level]")).toHaveText("100%")
		await expect(page.locator("[data-live-viewport]")).toHaveAttribute("style", /--zoom:1/)
		// The facade is a start control the script would show; with no script the iframe stands instead.
		await expect(page.locator(".live-start")).toBeHidden()
		const frame = page.locator("iframe[data-live-frame]")
		await expect(frame).toHaveAttribute("title", dictionary.liveDemoFrameTitle)
		await expect(frame).toHaveAttribute("src", "/demo/")
		await expect(frame).toHaveAttribute("loading", "lazy")
		// The way out to the full page needs no script, so it is offered whole.
		const open = page.locator(".live-open")
		await expect(open).toBeVisible()
		await expect(open).toHaveAttribute("href", "/demo/")
		await expect(open).toHaveText(dictionary.liveDemoOpen)
		// The drawn window and its stage are gone, so no part of the old window renders.
		await expect(
			page.locator("[data-app], .app-chat, .chat-message, [data-stage], [data-hint]"),
		).toHaveCount(0)
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
