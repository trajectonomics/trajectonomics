import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { measureOverflow } from "./fit"
import { outlineStyle, tabTo } from "./shell"

// The Overview opens on one focus point (#704): the answer is the largest text on the page, its whole
// sentence is in the heading a screen reader reads, one primary action sits under the chart only when
// the setup needs it, and the summary heading is in the first screen at a desktop's height.
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
		const answer = document.querySelector("[data-focus-answer]")
		/** Whether an element is the answer, holds it, or sits inside it. */
		const isAnswer = (element: Element): boolean =>
			answer !== null &&
			(element === answer || element.contains(answer) || answer.contains(element))
		/** Whether the element draws text of its own, and draws it. */
		const drawsText = (element: Element): boolean => {
			const shown = getComputedStyle(element)
			if (shown.display === "none" || shown.visibility === "hidden") return false
			const own = [...element.childNodes].some(
				(node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
			)
			return own && Number.parseFloat(shown.fontSize) > 0
		}
		let size = 0
		for (const element of document.querySelectorAll("main *")) {
			if (isAnswer(element) || !drawsText(element)) continue
			size = Math.max(size, Number.parseFloat(getComputedStyle(element).fontSize))
		}
		return size
	})
	expect(answerSize, "the answer's font size").toBeGreaterThan(largest)

	await expect(page.locator("[data-focus-heading]")).toContainText(
		"You could stop working in Oct 2040, when you are 50 and your partner is 48.",
	)
	await expect(page.locator("[data-focus-heading]")).toContainText(
		"Your money lasts to 2053 in 193 of 200 markets tested.",
	)
	await expect(page.locator("[data-primary-action]")).toHaveCount(0)

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

test("the answer and the notes chip each draw a solid focus ring", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await openDemo(page, "/", { theme: "light" })
	const chip = page.locator("[data-focus-chip]")
	await expect(chip).toBeVisible()
	const targets = [
		["the answer", page.locator("[data-focus-answer]")],
		["the chip", chip],
	] as const
	for (const [name, target] of targets) {
		await tabTo(page, target)
		expect(await outlineStyle(target), `${name}'s focus ring`).toBe("solid")
		const width = await target.evaluate((element) =>
			Number.parseFloat(getComputedStyle(element).outlineWidth),
		)
		expect(width, `${name}'s ring width`).toBeGreaterThanOrEqual(2)
	}
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

test("a phone keeps the whole answer off the page and never scrolls sideways", async ({ page }) => {
	for (const width of [360, 320]) {
		await page.setViewportSize({ width, height: 800 })
		await openDemo(page, "/", { theme: "light" })
		const heading = await page.locator("[data-focus-heading]").boundingBox()
		expect(heading?.width ?? 0, "the heading is screen-reader only").toBeLessThanOrEqual(1)
		expect(heading?.height ?? 0, "the heading is screen-reader only").toBeLessThanOrEqual(1)
		const fit = await measureOverflow(page, true)
		expect(fit.scrollWidth, `a ${width}px page's scroll width`).toBeLessThanOrEqual(fit.innerWidth)
	}
})
