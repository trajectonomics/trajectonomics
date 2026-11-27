import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

/** The text the page's hidden probe holds: a string left there is readable by find-in-page. */
function probeText(page: Page): Promise<string> {
	return page.evaluate(() => document.querySelector("[data-flow-probe]")?.textContent ?? "")
}

/** The computed visibility of the probe's text, which keeps it out of find-in-page even while it is written. */
function probeVisibility(page: Page): Promise<string> {
	return page.evaluate(() => {
		const probe = document.querySelector("[data-flow-probe]")
		return probe === null ? "" : getComputedStyle(probe).visibility
	})
}

/** Whether the browser's own find-in-page finds a string in the page. */
function found(page: Page, words: string): Promise<boolean> {
	return page.evaluate((text) => {
		window.getSelection()?.removeAllRanges()
		return (window as unknown as { find: (words: string) => boolean }).find(text)
	}, words)
}

/** A year other than the one shown. */
async function otherYear(page: Page): Promise<string> {
	const year = page.locator('select[name="year"]')
	const shown = await year.inputValue()
	const values = await year
		.locator("option")
		.evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
	const other = values.find((value) => value !== shown)
	if (other === undefined) throw new Error("the Demo has one year")
	return other
}

/** Two frames: one for the page to redraw its diagram, one for a measurement to be read. */
function frames(page: Page): Promise<unknown> {
	return page.evaluate(
		() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
	)
}

// The probe writes each string it measures into the page, then reads its width. Left there, a name or an
// amount it measured would still be found by find-in-page, and an amount the switch hides could be read
// from the probe. Emptying it after every measurement keeps both out of the page (#718).
test("the probe leaves no amount in the page while amounts are hidden", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await serveFlowLabels(page, await longFlowLabels(page))
	await openDemo(page, "/cash-flow/", { theme: "light" })
	const hide = page.getByRole("button", { name: "Hide amounts" }).first()
	const hiddenAmount = page.locator("main").getByText("amount hidden").first()

	// Hide and show once, so the mask's width is already measured when the year changes below.
	await hide.click()
	await expect(hiddenAmount).toBeAttached()
	await hide.click()
	await expect(hide).toHaveAttribute("aria-pressed", "false")

	// A year change measures its amounts again, now that the probe is the one the page measures through.
	await page.locator('select[name="year"]').selectOption(await otherYear(page))
	await frames(page)
	const amounts = await page.locator("[data-flow-amount]:visible").allTextContents()
	const amount = amounts.at(-1)
	expect(amount, "the year draws an amount").toBeDefined()

	// Hiding amounts then measures nothing new, so only an emptied probe leaves no amount behind.
	await hide.click()
	await expect(hiddenAmount).toBeAttached()
	await frames(page)
	expect(await probeText(page), "the probe is empty").toBe("")
	expect(await probeVisibility(page), "the probe is hidden").toBe("hidden")
	expect(await found(page, amount ?? ""), "find-in-page finds no hidden amount").toBe(false)
})
