import type { Page } from "@playwright/test"

/**
 * Every marker label of the page's charts that covers a dashed rule or leaves its plot, in the pixels the
 * browser drew. A chart whose labels are not yet drawn at its own width is reported too: it measured nothing.
 */
export function measureMarkers(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const charts = [...document.querySelectorAll<SVGSVGElement>('svg[role="img"]')].filter(
			(svg) => svg.querySelector("[data-marker-rule]") !== null,
		)
		return charts.flatMap((svg) => {
			const name = svg.getAttribute("aria-label")
			if (Math.abs(svg.viewBox.baseVal.width - svg.getBoundingClientRect().width) > 1) {
				return [`${name}: drawn at another width than the screen's`]
			}
			const grid = svg.querySelector("line.stroke-border")
			const left = Number(grid?.getAttribute("x1"))
			const right = Number(grid?.getAttribute("x2"))
			const rules = [...svg.querySelectorAll("[data-marker-rule]")].map((rule) =>
				Number(rule.getAttribute("x1")),
			)
			return [...svg.querySelectorAll<SVGTextElement>("[data-marker-label]")].flatMap((text) => {
				const box = text.getBBox()
				const [from, to] = [box.x, box.x + box.width]
				const said = `${name}: "${text.textContent}" from ${from.toFixed(1)} to ${to.toFixed(1)}`
				return [
					...(from >= left && to <= right ? [] : [`${said} leaves the plot ${left} to ${right}`]),
					...rules
						.filter((rule) => from < rule && rule < to)
						.map((rule) => `${said} crosses the rule at ${rule.toFixed(1)}`),
				]
			})
		})
	})
}
