import { expect, type Page } from "@playwright/test"
import { PRODUCTION_THEME } from "../src/lib/design/shipped-themes"
import type { Language } from "../src/lib/language/language"
import { LANGUAGE_CHOICE_COOKIE } from "../src/lib/language/stored-choice"
import { BASE_URL } from "./base-url"

/** One page the browser checks judge, and the status its real response must have. */
export interface PageUnderTest {
	readonly path: string
	readonly language: Language
	readonly name: string
	readonly status: number
	/** The Language the visitor stored before the page opened, or `null` when they stored none. */
	readonly storedChoice: Language | null
}

/** The Site's one address in each Language, and the real Not-found response every check judges. */
export const PAGES: readonly PageUnderTest[] = Object.freeze([
	{ path: "/", language: "en", name: "English home", status: 200, storedChoice: null },
	{ path: "/", language: "th", name: "Thai home", status: 200, storedChoice: "th" },
	{
		path: "/no-such-path/",
		language: "en",
		name: "Not-found page",
		status: 404,
		storedChoice: null,
	},
])

/**
 * The device schemes the harness sets before navigation. Both are kept although the Site ships one
 * Theme: a leftover device query in a component's own styles is what this catches ([ADR 0016]).
 */
export const DEVICE_SCHEMES = Object.freeze(["light", "dark"] as const)

/** The Language home of one Language, which every browser check judges. */
export function homeOf(language: Language): PageUnderTest {
	const home = PAGES.find(
		(underTest) => underTest.language === language && underTest.status === 200,
	)
	if (home === undefined) throw new Error(`the Site has no ${language} home`)
	return home
}

/**
 * Open one page the way a visitor reaches it: the Site's one address, with the Language choice the
 * visitor stored carried as a cookie. No check navigates to a Language build path, because no
 * visitor is ever given one (ADR 0020).
 */
export async function visit(page: Page, underTest: PageUnderTest): Promise<number> {
	if (underTest.storedChoice !== null) {
		await page
			.context()
			.addCookies([{ name: LANGUAGE_CHOICE_COOKIE, value: underTest.storedChoice, url: BASE_URL }])
	}
	const response = await page.goto(underTest.path)
	return response?.status() ?? 0
}

/** Open a page, assert its real status and the Language its document declares. */
export async function openPage(page: Page, underTest: PageUnderTest): Promise<void> {
	const status = await visit(page, underTest)
	expect(status, `${underTest.path} answers ${underTest.status}`).toBe(underTest.status)
	await expect(page.locator("html")).toHaveAttribute("lang", new RegExp(`^${underTest.language}`))
}

/** Assert the page painted the Theme a production build ships, whatever the device asked for. */
export async function expectShippedTheme(page: Page): Promise<void> {
	await expect(page.locator("html")).toHaveAttribute("data-theme", PRODUCTION_THEME)
}
