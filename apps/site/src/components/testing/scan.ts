import { type HtmlElement, type ScannedPage, scanHtml } from "../../lib/build/html"

/** One rendered component as elements and text runs, scanned with the same parser a built page gets. */
export function scanComponent(html: string): ScannedPage {
	return scanHtml(html)
}

/** The elements carrying one attribute, optionally with one exact value. */
export function withAttribute(
	page: ScannedPage,
	name: string,
	value?: string,
): readonly HtmlElement[] {
	return page.elements.filter(
		(element) =>
			name in element.attributes && (value === undefined || element.attributes[name] === value),
	)
}

/** The elements whose `class` carries one token, however many tokens the class has. */
export function withClass(page: ScannedPage, token: string): readonly HtmlElement[] {
	return page.elements.filter((element) =>
		(element.attributes["class"] ?? "").split(/\s+/).includes(token),
	)
}

/** The headings h1–h6 of a rendered component, in document order. */
export function headings(page: ScannedPage): readonly HtmlElement[] {
	return page.elements.filter((element) => /^h[1-6]$/.test(element.tag))
}
