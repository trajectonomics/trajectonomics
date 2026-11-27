import type { Page } from "@playwright/test"

/** A label drawn with a script whose marks reach above the line, such as Thai or Vietnamese. */
const MARKED = /[\u0E00-\u0E7F\u1E00-\u1EFF]/

const TOLERANCE = 0.5

/** How far a label's clip reaches past the fitted words on each side, so a glyph is never shaved. */
const SLACK = 2

interface Box {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
}

interface Drawn {
	readonly words: string
	readonly box: Box
	readonly clip: Box | null
	readonly amount: Box | null
	readonly advance: number
	readonly anchorX: number
	readonly anchor: string
}

/**
 * Every fault in the clip of every drawn label: the painted box fits both ways, with the clip reaching
 * `SLACK` units past the fitted words on both sides, and the clip stops before its amount starts.
 */
export function measureLabelClips(page: Page): Promise<string[]> {
	return faults(page, null)
}

/** Every fault in the up-and-down fit of a label drawn with marks above the line, such as Thai or Vietnamese. */
export function measureMarkedClip(page: Page): Promise<string[]> {
	return faults(page, MARKED)
}

async function faults(page: Page, only: RegExp | null): Promise<string[]> {
	const drawn = await drawnLabels(page)
	if (typeof drawn === "string") return [drawn]
	const found = only === null ? drawn : drawn.filter((label) => only.test(label.words))
	if (found.length === 0) {
		return [only === null ? "no label is drawn" : "no label with marks above the line is drawn"]
	}
	return found.flatMap((label) => faultsOf(label, only === null))
}

function faultsOf(label: Drawn, all: boolean): string[] {
	if (label.clip === null) return [`"${label.words}" has no clip`]
	const said = `"${label.words}" from ${label.box.x.toFixed(1)}, ${label.box.y.toFixed(1)} to ${(label.box.x + label.box.width).toFixed(1)}, ${(label.box.y + label.box.height).toFixed(1)}`
	const faults = clipFaults(said, label, all)
	if (label.amount === null) return [...faults, `${said} has no amount`]
	return label.clip.x + label.clip.width > label.amount.x + TOLERANCE
		? [...faults, `${said} has a clip that reaches its amount`]
		: faults
}

function clipFaults(said: string, label: Drawn, all: boolean): string[] {
	const { box, clip, anchor, anchorX, advance } = label
	if (clip === null) return []
	const ways: string[] = []
	const left = anchor === "end" ? anchorX - advance : anchorX
	const right = anchor === "end" ? anchorX : anchorX + advance
	const outside =
		clip.x > left - SLACK + TOLERANCE || clip.x + clip.width < right + SLACK - TOLERANCE
	if (all && outside) ways.push("sideways")
	if (box.y < clip.y - TOLERANCE || box.y + box.height > clip.y + clip.height + TOLERANCE) {
		ways.push("up or down")
	}
	return ways.map((way) => `${said} leaves its clip ${way}`)
}

function drawnLabels(page: Page): Promise<Drawn[] | string> {
	return page.evaluate(() => {
		const diagrams = [...document.querySelectorAll<SVGSVGElement>('svg[role="group"]')].filter(
			(svg) => svg.getBoundingClientRect().width > 0,
		)
		if (diagrams.length !== 1) return `${diagrams.length} flow diagrams are drawn`
		const svg = diagrams[0]
		if (svg === undefined) return "no flow diagram is drawn"
		const boxOf = (box: { x: number; y: number; width: number; height: number }) => ({
			x: box.x,
			y: box.y,
			width: box.width,
			height: box.height,
		})
		const clipOf = (text: Element) => {
			const id = /url\(#([^)]+)\)/u.exec(text.getAttribute("clip-path") ?? "")?.[1]
			const rect = id === undefined ? null : document.getElementById(id)?.querySelector("rect")
			if (rect == null) return null
			const number = (name: string) => Number(rect.getAttribute(name))
			return { x: number("x"), y: number("y"), width: number("width"), height: number("height") }
		}
		const amountOf = (text: Element) => {
			const next = text.nextElementSibling
			if (!(next instanceof SVGGraphicsElement)) return null
			const amount = next.matches("[data-flow-amount]")
				? next
				: next.querySelector("[data-flow-amount]")
			return amount instanceof SVGGraphicsElement ? boxOf(amount.getBBox()) : null
		}
		return [...svg.querySelectorAll<SVGGraphicsElement>("[data-flow-label]")].map((label) => {
			const text = label.closest("text") ?? label
			return {
				words: label.textContent ?? "",
				box: boxOf(label.getBBox()),
				clip: clipOf(text),
				amount: amountOf(text),
				advance: (label as SVGTextContentElement).getComputedTextLength(),
				anchorX: Number(text.getAttribute("x") ?? 0),
				anchor: text.getAttribute("text-anchor") ?? "start",
			}
		})
	})
}
