import type { Page } from "@playwright/test"

/** A label drawn with a script whose marks reach above the line, such as Thai or Vietnamese. */
const MARKED = /[\u0E00-\u0E7F\u1E00-\u1EFF]/

/**
 * Every fault in the clip of a label drawn with marks above the line: its painted box must fit its clip's
 * height, and a copy with the clip removed must paint the same box. Both diagrams are in the page and only
 * one is drawn, so the check names the drawn one. A page that draws no such label measured nothing.
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
				y: Number(rect.getAttribute("y")),
				height: Number(rect.getAttribute("height")),
			}
		}
		/** The box the same words paint with no clip in place. */
		const freeBox = (label: SVGGraphicsElement) => {
			const text = label.closest("text") ?? label
			const copy = text.cloneNode(true) as SVGGraphicsElement
			copy.removeAttribute("clip-path")
			text.parentNode?.insertBefore(copy, text.nextSibling)
			const box = copy.getBBox()
			copy.remove()
			return box
		}
		const differs = (free: DOMRect, box: DOMRect): boolean =>
			Math.abs(free.y - box.y) > 0.01 || Math.abs(free.height - box.height) > 0.01
		const leaves = (box: DOMRect, clip: { y: number; height: number }): boolean =>
			box.y < clip.y - 0.5 || box.y + box.height > clip.y + clip.height + 0.5
		const faultsOf = (label: SVGGraphicsElement): string[] => {
			const words = label.textContent ?? ""
			const box = label.getBBox()
			const clip = clipOf(label)
			if (clip === null) return [`"${words}" has no clip`]
			const said = `"${words}" from ${box.y.toFixed(1)} to ${(box.y + box.height).toFixed(1)}`
			const faults: string[] = []
			if (differs(freeBox(label), box))
				faults.push(`${said} paints a different box without its clip`)
			if (leaves(box, clip))
				faults.push(`${said} leaves its clip ${clip.y} to ${clip.y + clip.height}`)
			return faults
		}
		return labels.flatMap(faultsOf)
	}, MARKED.source)
}
