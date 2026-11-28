import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { longEstateLabels, serveEstateLabels } from "./estate-labels"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

/** The user's own text spacing (WCAG 1.4.12), added before the page first measures its diagram. */
function spaced(page: Page): Promise<unknown> {
	return page.addInitScript(() => {
		const css = "* { letter-spacing: .12em !important; word-spacing: .16em !important; }"
		const apply = () => {
			const target = document.head ?? document.documentElement
			if (target === null) return false
			const style = document.createElement("style")
			style.textContent = css
			target.append(style)
			return true
		}
		if (!apply()) {
			const observer = new MutationObserver(() => {
				if (apply()) observer.disconnect()
			})
			observer.observe(document, { childList: true, subtree: true })
		}
	})
}

/** The same spacing, added after the page has already measured and drawn its diagram. */
function spacedLater(page: Page): Promise<unknown> {
	return page.addStyleTag({
		content: "* { letter-spacing: .12em !important; word-spacing: .16em !important; }",
	})
}

/** Two frames: one for the observer to hear the new spacing, one for the derived fit to redraw. */
function frames(page: Page): Promise<unknown> {
	return page.evaluate(
		() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
	)
}

// Since #670 the SVG measures the names itself, so a user stylesheet's letter and word spacing come with
// the probe's text when the probe sits in the same styled context as the drawn names (#679).
for (const width of [360, 1280] as const) {
	test(`Cash flow keeps its names off their amounts with user text spacing, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await spaced(page)
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })
		expect(await measureFlowLabels(page), `a ${width}px Cash flow`).toEqual([])
	})

	test(`the Estate keeps its names off their amounts with user text spacing, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await spaced(page)
		await serveEstateLabels(page, await longEstateLabels(page))
		await openDemo(page, "/estate/?estate=end", { theme: "light" })
		expect(await measureFlowLabels(page), `a ${width}px Estate`).toEqual([])
	})
}

// Text spacing added after load changes the box of the hidden sample the probe watches, so every name is
// measured again at the spacing it now draws: the diagram redraws its fit instead of keeping the old one
// (#679).
for (const width of [360, 1280] as const) {
	test(`Cash flow refits when user text spacing is added after load, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })
		expect(await measureFlowLabels(page), `before the spacing, ${width}px`).toEqual([])
		await spacedLater(page)
		await frames(page)
		expect(await measureFlowLabels(page), `a ${width}px Cash flow`).toEqual([])
	})

	test(`the Estate refits when user text spacing is added after load, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveEstateLabels(page, await longEstateLabels(page))
		await openDemo(page, "/estate/?estate=end", { theme: "light" })
		expect(await measureFlowLabels(page), `before the spacing, ${width}px`).toEqual([])
		await spacedLater(page)
		await frames(page)
		expect(await measureFlowLabels(page), `a ${width}px Estate`).toEqual([])
	})
}
