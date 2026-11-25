import { expect, type Page, test } from "@playwright/test"
import { DEVICE_SCHEMES, expectShippedTheme, homeOf, openPage, PAGES_UNDER_TEST } from "./pages"

/** Thai text whose nearest declared Language, `html` included, is not Thai. */
function unmarkedThai(page: Page): Promise<readonly string[]> {
	return page.evaluate(() => {
		const isThai = (text: string): boolean => /[\u0E00-\u0E7F]/.test(text)
		const languageOf = (element: Element | null): string => {
			let current = element
			while (current !== null && current.getAttribute("lang") === null) {
				current = current.parentElement
			}
			return current?.getAttribute("lang") ?? ""
		}
		const unmarkedAt = (node: Node): string | undefined => {
			const text = node.textContent ?? ""
			if (!isThai(text)) return undefined
			if (node.parentElement?.closest("script, style") !== null) return undefined
			if (languageOf(node.parentElement).toLowerCase().startsWith("th")) return undefined
			return text.trim()
		}
		const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
		const unmarked: string[] = []
		while (walker.nextNode()) {
			const text = unmarkedAt(walker.currentNode)
			if (text !== undefined) unmarked.push(text)
		}
		return unmarked
	})
}

for (const scheme of DEVICE_SCHEMES) {
	test.describe(`the Language of the page on a ${scheme} device`, () => {
		test.use({ colorScheme: scheme })

		for (const underTest of PAGES_UNDER_TEST) {
			test(`${underTest.name} speaks the Language it declares`, async ({ page }) => {
				await openPage(page, underTest)
				await expectShippedTheme(page)
				expect(await unmarkedThai(page), `${underTest.path} marks every Thai run`).toEqual([])
			})
		}

		test("the Thai label on the English home is marked Thai", async ({ page }) => {
			await openPage(page, homeOf("en"))
			// The Language menu's panel is closed until its summary is clicked.
			await page.locator('details[data-header-menu]:has(a[href="/?lang=th"]) summary').click()
			const label = page.locator('[lang="th"]', { hasText: "ไทย" }).first()
			await expect(label).toBeVisible()
		})
	})
}
