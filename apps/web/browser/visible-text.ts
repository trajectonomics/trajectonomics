import type { Locator, Page } from "@playwright/test"

/** The text inside an element that a person can see: a closed Details keeps its figures out of it. */
export function visibleTextOf(target: Locator): Promise<string> {
	return target.evaluate(textAReaderSees)
}

/** The visible text of the whole page. */
export function visibleText(page: Page): Promise<string> {
	return page.evaluate(textAReaderSees, undefined)
}

/** Walks the text nodes and keeps the ones the browser draws; no root reads the whole body. */
function textAReaderSees(root: Element | undefined): string {
	const walker = document.createTreeWalker(root ?? document.body, NodeFilter.SHOW_TEXT)
	let text = ""
	while (walker.nextNode()) {
		const parent = walker.currentNode.parentElement
		if (parent === null || !parent.checkVisibility({ checkVisibilityCSS: true })) continue
		text += walker.currentNode.textContent ?? ""
	}
	return text
}
