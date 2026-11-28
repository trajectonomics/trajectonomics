import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { focusPointProblems } from "./focus-point"
import {
	expectFocusOnAPhone,
	expectMaskedFocus,
	FOCUS_PAGES,
	MASKED_FOCUS_PAGES,
} from "./focus-point-pages"
import { skipMaskingCheck } from "./masking"
import { PAGES, pageName } from "./pages"

for (const path of PAGES) {
	test(`${pageName(path)} has one focus point and one primary action`, async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await openDemo(page, path, { theme: "light" })
		const problems = await page.evaluate(focusPointProblems)
		expect(problems, path).toEqual([])
	})
}

test("a second answer and a second primary action are both reported", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/net-worth/", { theme: "light" })
	expect(await page.evaluate(focusPointProblems)).toEqual([])
	await page.evaluate(() => {
		const main = document.querySelector("main")
		if (main === null) throw new Error("no main")
		const answer = document.createElement("p")
		answer.textContent = "A second answer"
		answer.style.fontSize = "40px"
		// The page has no primary action of its own, so this draws a first filled one and then a second.
		const filled = (text: string): HTMLButtonElement => {
			const button = document.createElement("button")
			button.type = "button"
			button.textContent = text
			button.style.backgroundColor = getComputedStyle(main).color
			return button
		}
		main.append(answer, filled("A primary action"), filled("A second primary action"))
	})
	const problems = (await page.evaluate(focusPointProblems)).join("\n")
	expect(problems).toContain("2 elements draw text above 28px")
	expect(problems).toContain("2 primary actions")
})

for (const path of FOCUS_PAGES) {
	test(`${pageName(path)} keeps its focus point inside 360px and states the answer`, async ({
		page,
	}) => {
		await page.setViewportSize({ width: 360, height: 800 })
		await openDemo(page, path, { theme: "light" })
		await expectFocusOnAPhone(page, path)
	})
}

for (const path of MASKED_FOCUS_PAGES) {
	test(`${pageName(path)} masks its focus amount with Hide amounts on`, async ({ page }) => {
		skipMaskingCheck()
		await page.setViewportSize({ width: 1280, height: 800 })
		await openDemo(page, path, { theme: "light" })
		const figures = await page.locator("[data-focus-answer]").allInnerTexts()
		await openDemo(page, path, { theme: "light", hideAmounts: true })
		await expectMaskedFocus(page, path, figures)
	})
}
