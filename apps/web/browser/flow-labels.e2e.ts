import { expect, type Page, test } from "@playwright/test"
import { openDemo } from "./demo"
import {
	CYRILLIC,
	ENCLOSED,
	FAMILY,
	HOME_LOAN,
	JAPANESE,
	JAPANESE_PUNCTUATION,
	NETFLIX,
	PLAIN,
	SUBSCRIPTIONS,
	WIDE,
} from "./flow-label-cases"
import { measureFlowLabels } from "./flow-label-fit"
import { longFlowLabels, serveFlowLabels } from "./flow-labels"

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/** A label cut with an ellipsis, or the whole label when it fits. */
function drawn(text: string, whole: string): boolean {
	const kept = text.endsWith("…") ? text.slice(0, -1) : text
	return text === whole || whole.startsWith(kept)
}

/** A label drawn in whole graphemes: the whole string, or a prefix and an ellipsis. */
function graphemesHeld(labels: readonly string[], whole: string, prefix: string): void {
	const found = labels.filter((label) => label.startsWith(prefix))
	expect(found.length).toBeGreaterThan(0)
	for (const label of found) {
		expect(drawn(label, whole), label).toBe(true)
		expect(label).not.toContain("\uFFFD")
	}
}

/** The three capital labels that fit on `main`: all three at 360px, the first two at 1280px. */
function expectWholeCapitals(labels: readonly string[], width: number): void {
	const whole = width === 360 ? [SUBSCRIPTIONS, NETFLIX, HOME_LOAN] : [SUBSCRIPTIONS, NETFLIX]
	for (const text of whole) expect(labels, `${text} at ${width}px`).toContain(text)
}

/** Two twins of each kind stay distinct, because a cut label keeps the tail of the Flow's id. */
function expectTwins(labels: readonly string[]): void {
	for (const markers of [
		["contract)", "flat)"],
		["bank)", "vault)"],
		["pension)", "trust)"],
	] as const) {
		const twins = labels.filter((label) => markers.some((marker) => label.includes(marker)))
		expect(twins).toHaveLength(2)
		expect(new Set(twins).size).toBe(2)
	}
}

/** The diagram's labels, after the rule that none leaves it or covers its amount. */
async function drawnLabels(page: Page): Promise<string[]> {
	expect(await measureFlowLabels(page)).toEqual([])
	return page.locator("[data-flow-label]:visible").allTextContents()
}

// A label is cut and measured in the browser's own font, so only a real browser shows whether it covers
// its amount or leaves the diagram. 360px draws the stacked diagram and 1280px the wide one.
for (const width of [360, 1280] as const) {
	test(`Cash flow keeps its labels inside the diagram and off their amounts at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })

		const labels = await drawnLabels(page)
		expect(labels.filter((text) => text === PLAIN).length).toBeGreaterThan(0)
		expectWholeCapitals(labels, width)
		graphemesHeld(labels, JAPANESE, "家賃")
		graphemesHeld(labels, JAPANESE_PUNCTUATION, "コーヒー")
		graphemesHeld(labels, ENCLOSED, "㈱")
		graphemesHeld(labels, CYRILLIC, "Ж")
		graphemesHeld(labels, FAMILY, "👨")

		const wide = labels.filter((text) => /^W{2}/.test(text))
		expect(wide.length).toBeGreaterThan(0)
		for (const text of wide) {
			expect(text).toMatch(/^W+…$/)
			expect(text.length).toBeLessThan(WIDE.length)
		}
		expectTwins(labels)
		expect(labels.join("")).not.toMatch(LONE_SURROGATE)
	})
}

// The Estate's diagram is the same wide drawing, so its labels take the same clip and measurement.
for (const width of [360, 1280] as const) {
	test(`the Estate diagram keeps its labels inside and off their amounts at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await openDemo(page, "/estate/", { theme: "light" })
		expect(await measureFlowLabels(page)).toEqual([])
	})
}
