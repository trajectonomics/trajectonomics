import { expect, type Page, test } from "@playwright/test"
import { LANGUAGES } from "../src/lib/language"
import { openForReview, type ReviewTarget } from "./open"
import { answerConsent, signUp } from "./people"

const TARGETS: readonly ReviewTarget[] = [
	"sign-in",
	"welcome",
	"device",
	"consent",
	"account",
	"privacy",
	"terms",
]

const WIDTHS = [360, 1280] as const

/** The page's scroll width, which a horizontal overflow pushes past its own viewport. */
async function scrollsSideways(page: Page): Promise<{ scrollWidth: number; innerWidth: number }> {
	return page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		innerWidth: window.innerWidth,
	}))
}

for (const width of WIDTHS) {
	test.describe(`at ${width} px`, () => {
		test.use({ viewport: { width, height: 900 } })

		for (const language of LANGUAGES) {
			for (const target of TARGETS) {
				test(`${language} ${target} does not scroll sideways`, async ({ page }) => {
					await openForReview(page, target, language)
					const { scrollWidth, innerWidth } = await scrollsSideways(page)
					expect({ target: `${language} ${target}`, fits: scrollWidth <= innerWidth }).toEqual({
						target: `${language} ${target}`,
						fits: true,
					})
				})
			}
		}
	})
}

test("a 120-character unbroken name wraps instead of scrolling at 360 px", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	const name = "W".repeat(120)
	const user = await signUp(page, name)
	await answerConsent(page)
	await page.goto("/account/")
	await expect(page.getByRole("heading", { name })).toBeVisible()
	const { scrollWidth, innerWidth } = await scrollsSideways(page)
	expect(user.name).toBe(name)
	expect({ scrollWidth, innerWidth, fits: scrollWidth <= innerWidth }).toEqual({
		scrollWidth: expect.any(Number),
		innerWidth,
		fits: true,
	})
})
