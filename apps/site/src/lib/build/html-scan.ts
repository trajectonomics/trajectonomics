import type { HtmlElement, ScannedPage, TextRun } from "./html"
import { isCodeElement, isStandalone, parseAttributes, tagEnd, tagName } from "./html-tag"

/** The mutable lists one scan fills: every element, every text run, and the elements still open. */
interface Scan {
	readonly elements: HtmlElement[]
	readonly text: TextRun[]
	readonly open: HtmlElement[]
}

/** Records a run of text under the elements open at that point, skipping whitespace no one reads. */
function addText(scan: Scan, value: string): void {
	if (value.trim() === "") return
	scan.text.push(Object.freeze({ text: value, ancestors: Object.freeze([...scan.open]) }))
}

/** The index after the next `closing` marker from `from`, or the end of the document. */
function after(html: string, marker: string, from: number, skip: number): number {
	const found = html.indexOf(marker, from)
	return found === -1 ? html.length : found + skip
}

/** Applies one comment at `start`, and returns the index after it. */
function readComment(html: string, start: number): number {
	return after(html, "-->", start, 3)
}

/** Applies one closing tag, popping the element it names and everything still open inside it. */
function readClosingTag(scan: Scan, inner: string, next: number): number {
	const tag = inner.slice(1).trim().toLowerCase()
	const at = scan.open.findLastIndex((element) => element.tag === tag)
	if (at >= 0) scan.open.length = at
	return next
}

/** Applies one opening tag, and returns the index after it, or after the code inside it. */
function readOpeningTag(scan: Scan, html: string, inner: string, next: number): number {
	const tag = tagName(inner)
	if (tag === undefined) return next
	const element: HtmlElement = Object.freeze({
		tag,
		attributes: parseAttributes(inner.slice(tag.length)),
		ancestors: Object.freeze([...scan.open]),
	})
	scan.elements.push(element)
	if (isStandalone(tag, inner)) return next
	if (isCodeElement(tag)) return after(html.toLowerCase(), `</${tag}`, next, 0)
	scan.open.push(element)
	return next
}

/** Applies the tag that starts at `start`, and returns the index after it. */
function readTag(scan: Scan, html: string, start: number): number {
	if (html.startsWith("<!--", start)) return readComment(html, start)
	const end = tagEnd(html, start)
	const inner = html.slice(start + 1, end)
	const next = end + 1
	if (inner.startsWith("!") || inner.startsWith("?")) return next
	if (inner.startsWith("/")) return readClosingTag(scan, inner, next)
	return readOpeningTag(scan, html, inner, next)
}

/** A built page as one document-order list of elements and one list of text runs with their ancestors. */
export function scanHtml(html: string): ScannedPage {
	const scan: Scan = { elements: [], text: [], open: [] }
	let index = 0
	while (index < html.length) {
		const start = html.indexOf("<", index)
		addText(scan, html.slice(index, start === -1 ? html.length : start))
		if (start === -1) break
		index = readTag(scan, html, start)
	}
	return Object.freeze({ elements: Object.freeze(scan.elements), text: Object.freeze(scan.text) })
}
