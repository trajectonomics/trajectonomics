import type { Page } from "@playwright/test"

/**
 * Every fault in the one drawn Cash flow diagram, in its own viewBox units: a label that leaves the
 * diagram, or one whose box covers its amount's. Both diagrams are in the page and only one is drawn, so
 * the check names the drawn one. A page with no drawn diagram, or with labels and amounts out of step,
 * is a fault too: it measured nothing.
 */
export function measureFlowLabels(page: Page): Promise<string[]> {
	return page.evaluate(() => {
		const diagrams = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].filter(
			(svg) => svg.getBoundingClientRect().width > 0,
		)
		if (diagrams.length !== 1) return [`${diagrams.length} Cash flow diagrams are drawn`]
		const svg = diagrams[0]
		if (svg === undefined) return ["no Cash flow diagram is drawn"]
		const view = svg.viewBox.baseVal
		const labels = [...svg.querySelectorAll<SVGGraphicsElement>("[data-flow-label]")]
		const amounts = [...svg.querySelectorAll<SVGGraphicsElement>("[data-flow-amount]")]
		if (labels.length !== amounts.length) {
			return [`${labels.length} labels and ${amounts.length} amounts are drawn`]
		}
		const faultsOf = (label: SVGGraphicsElement, amount: SVGGraphicsElement): string[] => {
			const box = label.getBBox()
			const money = amount.getBBox()
			const said = `"${label.textContent ?? ""}" from ${box.x.toFixed(1)} to ${(box.x + box.width).toFixed(1)}`
			const faults: string[] = []
			if (box.x < view.x - 0.5 || box.x + box.width > view.x + view.width + 0.5) {
				faults.push(`${said} leaves the diagram ${view.x} to ${view.x + view.width}`)
			}
			if (box.x + box.width > money.x + 0.5) {
				faults.push(
					`${said} covers its amount "${amount.textContent ?? ""}" from ${money.x.toFixed(1)}`,
				)
			}
			return faults
		}
		return labels.flatMap((label, index) => {
			const amount = amounts[index]
			return amount === undefined ? ["a label has no amount"] : faultsOf(label, amount)
		})
	})
}
