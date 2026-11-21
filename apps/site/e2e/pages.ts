import { expect, type Page } from "@playwright/test"
import { PRODUCTION_THEME } from "../src/lib/design/shipped-themes"
import type { Language } from "../src/lib/language/language"

/**
 * What a check reaches through `./pages`: the page it judges, and the way a visitor opens one.
 * Interaction helpers live in `./controls`; only the page-opening pair is re-exported, because
 * every check opens a page through it.
 */
export { openPage, visit } from "./visit"

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

/** Assert the page painted the Theme a production build ships, whatever the device asked for. */
export async function expectShippedTheme(page: Page): Promise<void> {
	await expect(page.locator("html")).toHaveAttribute("data-theme", PRODUCTION_THEME)
}
