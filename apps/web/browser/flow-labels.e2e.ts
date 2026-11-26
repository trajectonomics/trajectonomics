import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"
import { measureFlowLabels } from "./flow-label-fit"
import { FAMILY, JAPANESE, longFlowLabels, PLAIN, serveFlowLabels, TWIN, WIDE } from "./flow-labels"

const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

// A label is cut and measured in the browser's own font, so only a real browser shows whether it covers
// its amount or leaves the diagram. 360px draws the stacked diagram and 1280px the wide one.
for (const width of [360, 1280] as const) {
	test(`Cash flow keeps its labels inside the diagram and off their amounts at ${width}px`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: 800 })
		await serveFlowLabels(page, await longFlowLabels(page))
		await openDemo(page, "/cash-flow/", { theme: "light" })

		// The rule first: a label that leaves the diagram or covers its amount is the fault.
		expect(await measureFlowLabels(page)).toEqual([])

		const labels = await page.locator("[data-flow-label]").allTextContents()
		expect(labels.filter((text) => text === PLAIN).length).toBeGreaterThan(0)

		const japanese = labels.filter((text) => text.startsWith("家賃"))
		expect(japanese.length).toBeGreaterThan(0)
		for (const text of japanese) {
			expect(text.endsWith("…")).toBe(true)
			expect(JAPANESE.startsWith(text.slice(0, -1))).toBe(true)
			expect(text).not.toContain("\uFFFD")
		}

		const wide = labels.filter((text) => text.startsWith("W"))
		expect(wide.length).toBeGreaterThan(0)
		for (const text of wide) {
			expect(text).toMatch(/^W+…$/)
			expect(text.length).toBeLessThan(WIDE.length)
		}

		const family = labels.filter((text) => text.startsWith("👨"))
		expect(family.length).toBeGreaterThan(0)
		for (const text of family) {
			const kept = text.endsWith("…") ? text.slice(0, -1) : text
			expect(FAMILY.startsWith(kept)).toBe(true)
		}

		expect(labels.filter((text) => text.endsWith("(salary)")).length).toBeGreaterThan(0)
		expect(labels.join("")).not.toMatch(LONE_SURROGATE)
		expect(labels).not.toContain(TWIN)
	})
}
