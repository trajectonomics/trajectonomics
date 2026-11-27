import { expect, test } from "@playwright/test"
import { openDemo } from "./demo"

/** Every point of the drawn line, in the page's pixels, sampled every other unit of path length. */
function lineHitsTheLabel(): string[] {
	const label = document.querySelector("[data-focus-label]")
	if (label === null) return ["no label"]
	const box = label.getBoundingClientRect()
	const hits: string[] = []
	/** Records the path points that fall inside the label's box. */
	const sample = (line: SVGPathElement): void => {
		const matrix = line.getScreenCTM()
		if (matrix === null) return
		for (let at = 0; at <= line.getTotalLength(); at += 2) {
			const point = new DOMPoint(line.getPointAtLength(at).x, line.getPointAtLength(at).y)
			const screen = point.matrixTransform(matrix)
			const inside =
				screen.x >= box.x &&
				screen.x <= box.x + box.width &&
				screen.y >= box.y &&
				screen.y <= box.y + box.height
			if (inside) hits.push(`${screen.x.toFixed(1)},${screen.y.toFixed(1)}`)
		}
	}
	for (const line of document.querySelectorAll("[data-focus-line]")) sample(line as SVGPathElement)
	return hits
}

// The runs-out line used to be drawn across its own answer. The label's whole box now sits above the
// curve within its span, and the test samples the drawn path to prove no point of it enters the box.
test("the label's box stays clear of the line it names", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 })
	for (const path of ["/", "/?scenario=retire-early"]) {
		await openDemo(page, path, { theme: "light" })
		const hits = await page.evaluate(lineHitsTheLabel)
		expect(hits, `${path}: the line through the label's box`).toEqual([])
	}
})
