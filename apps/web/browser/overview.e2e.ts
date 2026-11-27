import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

// The Overview opens on one focus point (#704): the answer is the largest text on the page, its whole
// sentence is in the heading a screen reader reads, one primary action sits under the chart, and the
// summary heading is in the first screen at a desktop's height.
test("the answer on the chart is the largest text in main, and the focus point fits one screen", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light" })

	const label = page.locator("[data-focus-answer]")
	await expect(label).toBeVisible()
	const answerSize = await label.evaluate((element) =>
		Number.parseFloat(getComputedStyle(element).fontSize),
	)
	const largest = await page.evaluate(() => {
		let size = 0
		for (const element of document.querySelectorAll("main *")) {
			const shown = getComputedStyle(element)
			if (shown.display === "none" || shown.visibility === "hidden") continue
			const hasText = [...element.childNodes].some(
				(node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
			)
			if (hasText) size = Math.max(size, Number.parseFloat(shown.fontSize))
		}
		return size
	})
	expect(answerSize, "the answer's font size").toBe(largest)

	await expect(page.locator("[data-focus-heading]")).toContainText(
		"You could stop working in Oct 2040, when you are 50 and your partner is 48.",
	)
	await expect(page.locator("[data-focus-heading]")).toContainText(
		"Your money lasts to 2053 in 193 of 200 markets tested.",
	)
	await expect(page.locator("[data-primary-action]")).toHaveCount(1)

	const focus = await page.locator("[data-focus-section]").boundingBox()
	expect(focus, "the focus point is laid out").not.toBeNull()
	expect((focus?.y ?? 0) + (focus?.height ?? 0), "the focus point's bottom").toBeLessThanOrEqual(
		800,
	)
	const summary = await page.getByRole("heading", { level: 2, name: "Your summary" }).boundingBox()
	expect(summary, "the summary heading is laid out").not.toBeNull()
	expect(
		(summary?.y ?? 0) + (summary?.height ?? 0),
		"the summary heading's bottom",
	).toBeLessThanOrEqual(800)
})

test("a phone shows the summary in two columns", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await openDemo(page, "/", { theme: "light" })
	const columns = await page.locator("[data-summary-grid]").evaluate((element) => {
		const template = getComputedStyle(element).gridTemplateColumns
		return template.split(" ").filter((part) => part !== "").length
	})
	expect(columns).toBe(2)
})
