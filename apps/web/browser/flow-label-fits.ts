import type { Page } from "@playwright/test"

const NS = "http://www.w3.org/2000/svg"

/** One band as the hidden table states it: the whole name and the amount the page draws. */
interface Row {
	readonly full: string
	readonly amount: string
}

/**
 * Faults in the drawn diagram at the font it draws: a name that fits its room is drawn whole, in either
 * layout. The room is read from the layout and the whole names from the hidden band table, while the
 * widths are read from the SVG itself, so the check does not trust the fitter.
 */
export function measureFittedNames(page: Page): Promise<string[]> {
	return page.evaluate((namespace) => {
		const drawn = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].find(
			(svg) => svg.getBoundingClientRect().width > 0,
		)
		if (drawn === undefined) return ["no flow diagram is drawn"]
		const width = Math.round(drawn.viewBox.baseVal.width)
		if (width !== 320 && width !== 800) return [`the diagram is ${width} units wide`]

		const rows = [...document.querySelectorAll(".sr-only table")].flatMap((table) =>
			[...table.querySelectorAll("tbody tr")].map((row) => ({
				full: row.children[1]?.textContent ?? "",
				amount: row.children[2]?.textContent ?? "",
			})),
		)
		const measure = (text: string): number => {
			const probe = document.createElementNS(namespace, "text") as SVGTextElement
			probe.setAttribute("class", "fill-foreground")
			probe.textContent = text
			drawn.append(probe)
			const length = probe.getComputedTextLength()
			probe.remove()
			return length
		}
		const roomOf = (line: Element, amount: string): number => {
			if (width === 320) return width - 2 * 8 - 8 - measure(amount)
			const x = Number(line.getAttribute("x") ?? 0)
			const anchor = line.getAttribute("text-anchor") ?? "start"
			return (anchor === "end" ? x - 8 : width - 8 - x) - measure(amount) - 3
		}
		const cutFault = (label: SVGGraphicsElement, line: Element, row: Row): string[] => {
			const shown = label.textContent ?? ""
			const room = roomOf(line, row.amount)
			if (shown === row.full) return []
			if (measure(row.full) > room) return []
			return [`"${row.full}" fits ${room.toFixed(1)} units but is drawn as "${shown}"`]
		}
		const faultsOf = (label: SVGGraphicsElement, index: number): string[] => {
			const row = rows[index]
			if (row === undefined) return [`"${label.textContent ?? ""}" has no table row`]
			const line = label.closest("text") ?? label
			if (line.nextElementSibling?.textContent !== row.amount) {
				return [`"${row.full}" does not sit beside its amount "${row.amount}"`]
			}
			return cutFault(label, line, row)
		}
		const labels = [...drawn.querySelectorAll<SVGGraphicsElement>("[data-flow-label]")]
		if (labels.length !== rows.length) {
			return [`${labels.length} labels and ${rows.length} table rows are drawn`]
		}
		return labels.flatMap(faultsOf)
	}, NS)
}
