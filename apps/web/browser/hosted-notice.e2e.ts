import { expect, test } from "@playwright/test"
import { measureOverflow } from "./fit"
import { openHosted } from "./hosted"

// The demo note (web #698) is one line on a desktop, at most two on a phone, and never widens the page.
const HEIGHT_PX = 800

for (const [width, lines] of [
	[1280, 1],
	[360, 2],
] as const) {
	test(`hosted: the demo note is at most ${lines} line(s) at ${width}px, and the page does not scroll sideways`, async ({
		page,
	}) => {
		await page.setViewportSize({ width, height: HEIGHT_PX })
		await openHosted(page, "/")
		const note = page.getByRole("note", { name: "About this demo" })
		await expect(note).toBeVisible()
		const measured = await note.evaluate((element) => {
			const paragraph = element.querySelector("p")
			if (paragraph === null) return 0
			const range = document.createRange()
			range.selectNodeContents(paragraph)
			const tops = [...range.getClientRects()]
				.filter((rect) => rect.height > 0)
				.map((rect) => Math.round(rect.top))
			return new Set(tops).size
		})
		expect(measured).toBeLessThanOrEqual(lines)
		const fit = await measureOverflow(page, true)
		expect(fit.scrollWidth, "the page's scroll width").toBeLessThanOrEqual(fit.innerWidth)
	})
}
