import { expect, type Page, test } from "@playwright/test"
import { expectTheme, homeOf, openPage, PAGES, THEMES } from "./pages"

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

for (const theme of THEMES) {
	test.describe(`the Language of the page, ${theme} theme`, () => {
		test.use({ colorScheme: theme })

		for (const underTest of PAGES) {
			test(`${underTest.name} speaks the Language it declares`, async ({ page }) => {
				await openPage(page, underTest)
				await expectTheme(page, theme)
				expect(await unmarkedThai(page), `${underTest.path} marks every Thai run`).toEqual([])
			})
		}

		test("the Thai label on the English home is marked Thai", async ({ page }) => {
			await openPage(page, homeOf("en"))
			const label = page.locator('[lang="th"]', { hasText: "ไทย" }).first()
			await expect(label).toBeVisible()
		})
	})
}
