import { type AssetGraph, walkAssets } from "./asset-graph"
import { sameOriginPath } from "./asset-url"
import type { BuiltFile } from "./built-files"
import { isStylesheetLink, scanHtml } from "./html"

const CSS_IMPORT = /@import\s+(?:url\(\s*)?["']([^"']+)["']/gi

/** The same-origin stylesheets one page paints with, and the linked ones the build did not produce. */
export type PageStylesheets = AssetGraph

/** The stylesheet paths a page links directly. */
function linksOf(page: BuiltFile): readonly string[] {
	return scanHtml(page.content)
		.elements.filter((element) => isStylesheetLink(element))
		.flatMap((element) => {
			const href = element.attributes["href"]
			const path = href === undefined ? undefined : sameOriginPath(page.path, href)
			return path === undefined ? [] : [path]
		})
}

/** The stylesheets a built file imports with `@import`, read against the file that writes it. */
function importsOf(file: BuiltFile): readonly string[] {
	return [...file.content.matchAll(CSS_IMPORT)].flatMap((match) => {
		const path = match[1] === undefined ? undefined : sameOriginPath(file.path, match[1])
		return path === undefined ? [] : [path]
	})
}

/** Every stylesheet a page paints with, each once, however many pages or imports name it. */
export function pageStylesheets(files: readonly BuiltFile[], page: BuiltFile): PageStylesheets {
	return walkAssets(files, [...linksOf(page), ...importsOf(page)], importsOf)
}
