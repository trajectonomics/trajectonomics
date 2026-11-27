import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import { HOME_LOAN, NETFLIX, SUBSCRIPTIONS } from "./flow-label-cases"
import { measureLabelClips } from "./flow-label-clip"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

const NS = "http://www.w3.org/2000/svg"

/** The drawn width of one string in the diagram's units, at the font the SVG draws, minimum font included. */
function drawnWidth(page: Page, text: string): Promise<number> {
	return page.evaluate(
		({ namespace, words }) => {
			const svg = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].find(
				(element) => element.getBoundingClientRect().width > 0,
			)
			if (svg === undefined) return 0
			const probe = document.createElementNS(namespace, "text") as SVGTextElement
			probe.setAttribute("class", "fill-foreground")
			probe.textContent = words
			svg.append(probe)
			const width = probe.getComputedTextLength()
			probe.remove()
			return width
		},
		{ namespace: NS, words: text },
	)
}

/** The size the browser's style system states for the diagram's text. */
function statedSize(page: Page): Promise<number> {
	return page.evaluate(() => {
		const label = document.querySelector<SVGTextElement>("[data-flow-label]")
		return label === null ? 0 : Number.parseFloat(getComputedStyle(label).fontSize)
	})
}

/** The three capital labels that fit on `main`: all three at 360px, the first two at 1280px. */
function expectWholeCapitals(labels: readonly string[], width: number): void {
	const whole = width === 360 ? [SUBSCRIPTIONS, NETFLIX, HOME_LOAN] : [SUBSCRIPTIONS, NETFLIX]
	for (const text of whole) expect(labels, `${text} at ${width}px`).toContain(text)
}

/**
 * Faults in the phone list at the minimum font: a name that fits its room is drawn whole. The room is
 * read from `layoutStack` and the drawn width from the SVG itself, so the check does not trust the fitter.
 */
function listFaults(page: Page): Promise<string[]> {
	return page.evaluate((namespace) => {
		const svg = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].find(
			(element) => element.getBoundingClientRect().width > 0,
		)
		if (svg === undefined) return ["no flow diagram is drawn"]
		if (Math.round(svg.viewBox.baseVal.width) !== 320) return ["the wide diagram is drawn"]
		const measure = (text: string): number => {
			const probe = document.createElementNS(namespace, "text") as SVGTextElement
			probe.setAttribute("class", "fill-foreground")
			probe.textContent = text
			svg.append(probe)
			const width = probe.getComputedTextLength()
			probe.remove()
			return width
		}
		const faultsOf = (label: SVGGraphicsElement): string[] => {
			const shown = label.textContent ?? ""
			const amount = label.nextElementSibling?.textContent ?? ""
			const aria = label.closest("g")?.getAttribute("aria-label") ?? ""
			const suffix = `, ${amount}`
			if (!aria.endsWith(suffix)) return [`"${aria}" does not end with its amount "${amount}"`]
			const full = aria.slice(0, -suffix.length)
			const room = 320 - 2 * 8 - 8 - measure(amount)
			const cut = measure(full) <= room && shown !== full
			return cut ? [`"${full}" fits ${room.toFixed(1)} units but is drawn as "${shown}"`] : []
		}
		return [...svg.querySelectorAll<SVGGraphicsElement>("[data-flow-label]")].flatMap(faultsOf)
	}, NS)
}

// Chromium is launched with `--blink-settings=minimumFontSize=24` by the `min-font` project. The browser
// then states 24px for the 12px diagram text but the SVG still draws it at 12px, so a measure that read the
// stated size would cut every name far too short and collapse the twins. The phone list is where the
// twins' ids still fit.
for (const width of [360, 1280] as const) {
	test(`Cash flow fits its names at the browser's 24px minimum font, ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })
		expect(await statedSize(page), "the minimum font is stated").toBeGreaterThan(14)
		// Five Ms are about 50 units at 12px, not the 100 the stated 24px would give.
		expect(await drawnWidth(page, "MMMMM"), "the SVG still draws 12px").toBeLessThan(60)
		expect(await measureFlowLabels(page)).toEqual([])
		expect(await measureLabelClips(page)).toEqual([])
		if (width === 360) expect(await listFaults(page)).toEqual([])
		const labels = await page.locator("[data-flow-label]:visible").allTextContents()
		expectWholeCapitals(labels, width)
		for (const start of ["Consulting (a", "Saving (a", "Withdraw (a"]) {
			const twins = labels.filter((text) => text.startsWith(start))
			expect(twins, start).toHaveLength(2)
			expect(new Set(twins).size, start).toBe(2)
		}
	})
}
