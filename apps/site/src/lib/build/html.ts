import { parseAttributes } from "./html-tag"

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

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi

/** One `<script>` element of a built page: the attributes it carries, and its body as written. */
export interface ScriptElement {
	readonly attributes: Readonly<Record<string, string>>
	readonly body: string
}

/** Every `<script>` element of a built page, in document order, its body read as written. */
export function scriptElements(html: string): readonly ScriptElement[] {
	return [...html.matchAll(SCRIPT)].map((match) =>
		Object.freeze({ attributes: parseAttributes(match[1] ?? ""), body: match[2] ?? "" }),
	)
}

/** The `rel` tokens of an element, lowercased, because `rel` is a space-separated token list. */
export function relTokens(element: HtmlElement): readonly string[] {
	return (element.attributes["rel"] ?? "").toLowerCase().split(/\s+/).filter(Boolean)
}

/** The type a data block declares, the one kind of script a page carries and runs none of. */
const DATA_BLOCK = /\bapplication\/ld\+json\b/i

/** Whether a `script` `type` names a data block, which is data and not the page's program. */
export function isDataBlockType(type: string | undefined): boolean {
	return DATA_BLOCK.test(type ?? "")
}

/** Whether an element is a script the document carries itself, so it runs before any file loads. */
export function isInlineScript(element: HtmlElement): boolean {
	return (
		element.tag === "script" &&
		element.attributes["src"] === undefined &&
		!isDataBlockType(element.attributes["type"])
	)
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
