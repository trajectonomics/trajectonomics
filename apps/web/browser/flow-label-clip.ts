import type { Page } from "@playwright/test"

/** A label drawn with a script whose marks reach above the line, such as Thai or Vietnamese. */
const MARKED = /[\u0E00-\u0E7F\u1E00-\u1EFF]/

/** A clip rect and the box it holds, in the diagram's own units. */
interface Box {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
}

/**
 * Every fault in the clip of a label drawn with marks above the line: its painted box must fit its clip
 * both ways, and the clip must end before its amount starts. The clip itself is what holds a glyph that
 * paints a little past the canvas measure, so a box inside it is the whole drawing. Both diagrams are in
 * the page and only one is drawn, so the check names the drawn one. A page that draws no such label
 * measured nothing.
 */
export function measureMarkedClip(page: Page): Promise<string[]> {
	return page.evaluate((marked) => {
		const diagrams = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].filter(
			(svg) => svg.getBoundingClientRect().width > 0,
		)
		if (diagrams.length !== 1) return [`${diagrams.length} flow diagrams are drawn`]
		const svg = diagrams[0]
		if (svg === undefined) return ["no flow diagram is drawn"]
		const labels = [...svg.querySelectorAll<SVGGraphicsElement>("[data-flow-label]")].filter(
			(label) => new RegExp(marked, "u").test(label.textContent ?? ""),
		)
		if (labels.length === 0) return ["no label with marks above the line is drawn"]
		/** The clip's box, or null when the words have no clip of their own. */
		const clipOf = (label: SVGGraphicsElement) => {
			const text = label.closest("text") ?? label
			const id = /url\(#([^)]+)\)/u.exec(text.getAttribute("clip-path") ?? "")?.[1]
			const rect = id === undefined ? null : document.getElementById(id)?.querySelector("rect")
			if (rect == null) return null
			return {
				x: Number(rect.getAttribute("x")),
				y: Number(rect.getAttribute("y")),
				width: Number(rect.getAttribute("width")),
				height: Number(rect.getAttribute("height")),
			}
		}
		/** The amount drawn after the label, in the same row of either diagram. */
		const amountOf = (label: SVGGraphicsElement): SVGGraphicsElement | null => {
			const text = label.closest("text") ?? label
			const next = text.nextElementSibling
			if (!(next instanceof SVGGraphicsElement)) return null
			// The phone list marks the amount's <text>; the wide diagram marks the <tspan> inside it.
			return next.matches("[data-flow-amount]")
				? next
				: next.querySelector<SVGGraphicsElement>("[data-flow-amount]")
		}
		const outside = (box: Box, clip: Box): string[] => {
			const faults: string[] = []
			if (box.x < clip.x - 0.5 || box.x + box.width > clip.x + clip.width + 0.5) {
				faults.push("sideways")
			}
			if (box.y < clip.y - 0.5 || box.y + box.height > clip.y + clip.height + 0.5) {
				faults.push("up or down")
			}
			return faults
		}
		const faultsOf = (label: SVGGraphicsElement): string[] => {
			const words = label.textContent ?? ""
			const box = label.getBBox()
			const clip = clipOf(label)
			if (clip === null) return [`"${words}" has no clip`]
			const said = `"${words}" from ${box.x.toFixed(1)}, ${box.y.toFixed(1)} to ${(box.x + box.width).toFixed(1)}, ${(box.y + box.height).toFixed(1)}`
			const faults = outside(box, clip).map((way) => `${said} leaves its clip ${way}`)
			const amount = amountOf(label)?.getBBox()
			if (amount === undefined) faults.push(`${said} has no amount`)
			else if (clip.x + clip.width > amount.x + 0.5) {
				faults.push(`${said} has a clip that reaches its amount`)
			}
			return faults
		}
		return labels.flatMap(faultsOf)
	}, MARKED.source)
}
