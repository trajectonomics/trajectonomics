/** An element of a built page, as far as a check needs it: a tag and the attributes the build wrote. */
export interface HtmlElement {
	readonly tag: string
	readonly attributes: Readonly<Record<string, string>>
	/** The elements this one sits inside, outermost first. */
	readonly ancestors: readonly HtmlElement[]
}

/** A run of text in a built page with every element it sits inside, outermost first. */
export interface TextRun {
	readonly text: string
	readonly ancestors: readonly HtmlElement[]
}

/** The elements of a built page in document order, and its text runs with their ancestors. */
export interface ScannedPage {
	readonly elements: readonly HtmlElement[]
	readonly text: readonly TextRun[]
}

export { scanHtml } from "./html-scan"

/** The `rel` tokens of an element, lowercased, because `rel` is a space-separated token list. */
export function relTokens(element: HtmlElement): readonly string[] {
	return (element.attributes["rel"] ?? "").toLowerCase().split(/\s+/).filter(Boolean)
}

/** Whether an element is a script the document carries itself, so it runs before any file loads. */
export function isInlineScript(element: HtmlElement): boolean {
	return element.tag === "script" && element.attributes["src"] === undefined
}

/** Whether an element is a stylesheet link, the only link that can paint the page. */
export function isStylesheetLink(element: HtmlElement): boolean {
	return element.tag === "link" && relTokens(element).includes("stylesheet")
}

/** Every element of one tag, in document order. */
export function elementsByTag(page: ScannedPage, tag: string): readonly HtmlElement[] {
	return page.elements.filter((element) => element.tag === tag)
}

/** The text an element carries, whitespace collapsed, from the runs inside it. */
export function textOf(page: ScannedPage, element: HtmlElement): string {
	return page.text
		.filter((run) => run.ancestors.includes(element))
		.map((run) => run.text)
		.join(" ")
		.replace(/\s+/g, " ")
		.trim()
}
