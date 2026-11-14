import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { isInlineScript, isStylesheetLink, type ScannedPage, scanHtml } from "./html"

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

/** The inline script that reads the device scheme is there, and runs before the first stylesheet. */
function checkScript(path: string, page: ScannedPage): readonly BuildFailure[] {
	const script = page.elements.findIndex(isInlineScript)
	if (script === -1) {
		return [
			buildFailure(
				"THEME_SCRIPT_MISSING",
				path,
				"the page has no inline script, so a device set to dark still gets the light Theme.",
			),
		]
	}
	const stylesheet = page.elements.findIndex(isStylesheetLink)
	if (stylesheet === -1 || script < stylesheet) return []
	return [
		buildFailure(
			"THEME_SCRIPT_NOT_FIRST",
			path,
			"the inline script comes after the first stylesheet, so the Theme paints one frame late.",
		),
	]
}

/** Every built page links a stylesheet and sets the Theme before that stylesheet runs. */
export function checkThemeHead(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => {
		const page = scanHtml(file.content)
		return [...checkStylesheet(file.path, page), ...checkScript(file.path, page)]
	})
}
