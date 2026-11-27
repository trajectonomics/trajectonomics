/**
 * Every point of the focus chart's drawn line, in the page's pixels and sampled every other unit of
 * path length, that falls inside the answer's box (its faces included). Empty when the line clears
 * the box. Evaluated in the page, so it can only use the document.
 */
export function lineHitsTheLabel(): string[] {
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
