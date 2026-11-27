import { test } from "@playwright/test"
import { LANGUAGES } from "../src/lib/language"
import { openForReview, type ReviewTarget } from "./open"

/** The pages the pull request shows. English at both widths, Thai at the phone width. */
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

for (const width of WIDTHS) {
	test.describe(`screenshots at ${width} px`, () => {
		test.use({ viewport: { width, height: 900 }, colorScheme: "light" })

		for (const target of TARGETS) {
			for (const language of LANGUAGES) {
				if (language === "th" && width !== 360) continue
				test(`${language} ${target}`, async ({ page }) => {
					await openForReview(page, target, language)
					await page.waitForTimeout(200)
					await page.screenshot({
						path: `e2e/screenshots/${language}-${target}-${width}.png`,
						fullPage: true,
						animations: "disabled",
					})
				})
			}
		}
	})
}
