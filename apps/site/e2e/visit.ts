import { expect, type Page } from "@playwright/test"
import { LANGUAGE_CHOICE_COOKIE } from "../src/lib/language/stored-choice"
import { BASE_URL } from "./base-url"
import type { PageUnderTest } from "./pages"

/**
 * How a check opens a page a visitor could reach: the Site's address, with the Language choice the
 * visitor stored carried as a cookie. No check navigates to a Language build path, because no
 * visitor is ever given one (ADR 0020). A check that must see a first visit's own cookie handling
 * calls `page.goto` itself, because seeding the choice here would hide what it asserts.
 */

/** Open one page and return the status its real response carried. */
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
