import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { HOME_LOAN, NETFLIX, SUBSCRIPTIONS } from "./flow-label-cases"
import { measureFlowLabels } from "./flow-label-fit"
import { countMeasurements, frames, measurements, resetMeasurements } from "./flow-label-watch"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

/** The names the wide diagram drew, whether or not its wrapper is hidden at this breakpoint. */
function hiddenWideNames(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const wide = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].find(
			(svg) => Math.round(svg.viewBox.baseVal.width) === 800,
		)
		return [...(wide?.querySelectorAll("[data-flow-label]") ?? [])].map(
			(element) => element.textContent ?? "",
		)
	})
}

// The wide diagram is in the page below `md`, hidden by CSS, so its names must be fitted through the
// always-drawn probe even there. A resize across the breakpoint then changes which diagram is drawn
// without changing the fit or clearing the widths.
test("a resize across the 768px breakpoint keeps the wide diagram's fit", async ({ page }) => {
	await page.setViewportSize({ width: 360, height: 800 })
	await countMeasurements(page)
	await serveFlowLabels(page, await longFlowLabels(page))
	await openDemo(page, "/cash-flow/", { theme: "light" })
	// The hidden wide diagram is fitted at the drawn size, so the names that fit are whole before the resize.
	const hidden = await hiddenWideNames(page)
	expect(hidden).toContain(SUBSCRIPTIONS)
	expect(hidden).toContain(NETFLIX)
	expect(await measureFlowLabels(page)).toEqual([])

	await resetMeasurements(page)
	await page.setViewportSize({ width: 1280, height: 800 })
	await frames(page)
	expect(await measureFlowLabels(page)).toEqual([])
	expect(await measurements(page), "a resize measured no name again").toBe(0)
	const wide = await page.locator("[data-flow-label]:visible").allTextContents()
	expect(wide).toContain(SUBSCRIPTIONS)
	expect(wide).toContain(NETFLIX)

	await resetMeasurements(page)
	await page.setViewportSize({ width: 360, height: 800 })
	await frames(page)
	expect(await measureFlowLabels(page)).toEqual([])
	expect(await measurements(page), "a resize back measured no name again").toBe(0)
	const stack = await page.locator("[data-flow-label]:visible").allTextContents()
	expect(stack).toContain(SUBSCRIPTIONS)
	expect(stack).toContain(HOME_LOAN)
})

/** Counts the `ResizeObserver`s the page makes for the flow probe's hidden sample text. */
function countProbeObservers(page: Page): Promise<number> {
	return page.evaluate(
		() => (window as unknown as { __flowObservers: number }).__flowObservers ?? -1,
	)
}

// A year change remounts the diagram but not the page's one probe, so it clears no measured widths and
// adds no observer (#718). The count is taken only for the probe's own box, never for other charts.
test("a year change neither re-watches the probe nor clears its widths", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	await countMeasurements(page)
	await page.addInitScript(() => {
		const Original = window.ResizeObserver
		let count = 0
		window.ResizeObserver = class extends Original {
			override observe(target: Element, options?: ResizeObserverOptions): void {
				if (target.hasAttribute("data-flow-size")) count += 1
				super.observe(target, options)
			}
		} as typeof ResizeObserver
		Object.defineProperty(window, "__flowObservers", { get: () => count })
	})
	await serveFlowLabels(page, await longFlowLabels(page))
	await openDemo(page, "/cash-flow/", { theme: "light" })
	expect(await countProbeObservers(page)).toBe(1)
	const year = page.locator('select[name="year"]')
	const selected = await year.inputValue()
	const other = (
		await year
			.locator("option")
			.evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value))
	).find((value) => value !== selected)
	expect(other, "the Demo has another year").toBeDefined()
	await year.selectOption(other ?? "")
	await frames(page)
	expect(await countProbeObservers(page)).toBe(1)
	expect(await measureFlowLabels(page)).toEqual([])
	// Every name of the year the page opened on was measured before, so coming back measures none of them
	// again: a cleared cache would measure every one of them.
	await resetMeasurements(page)
	await year.selectOption(selected)
	await frames(page)
	expect(await measurements(page), "coming back measured no name again").toBe(0)
	expect(await countProbeObservers(page)).toBe(1)
})
