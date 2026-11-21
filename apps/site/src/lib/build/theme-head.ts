import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { isStylesheetLink, type ScannedPage, scanHtml } from "./html"

/** The page links the stylesheet that paints it. */
function checkStylesheet(path: string, page: ScannedPage): readonly BuildFailure[] {
	if (page.elements.some(isStylesheetLink)) return []
	return [
		buildFailure(
			"THEME_STYLESHEET_MISSING",
			path,
			"the page links no stylesheet, so the Semantic Token Roles resolve to nothing.",
		),
	]
}

/** Every built page links the stylesheet that paints it. */
export function checkThemeHead(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => checkStylesheet(file.path, scanHtml(file.content)))
}
