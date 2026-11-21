import { isShippedTheme } from "../design/shipped-themes"
import type { DesignTokens } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type ScannedPage, scanHtml } from "./html"

/** The page asks for a Theme this build ships, and that Theme is one the published CSS defines. */
function checkPage(
	path: string,
	page: ScannedPage,
	tokens: DesignTokens,
	themes: readonly string[],
): readonly BuildFailure[] {
	const [html] = elementsByTag(page, "html")
	const requested = html?.attributes["data-theme"]
	if (requested === undefined) {
		return [
			buildFailure(
				"THEME_ATTRIBUTE_MISSING",
				path,
				"<html> has no data-theme, so the page is unstyled (design-system ADR 0005).",
			),
		]
	}
	const published = tokens.themes.map((theme) => theme.name).join(", ")
	if (!tokens.themes.some((theme) => theme.name === requested)) {
		return [
			buildFailure(
				"THEME_ATTRIBUTE_NOT_PUBLISHED",
				path,
				`data-theme="${requested}" names no Theme the published CSS defines (${published}).`,
			),
		]
	}
	if (isShippedTheme(requested, themes)) return []
	return [
		buildFailure(
			"THEME_ATTRIBUTE_NOT_SHIPPED",
			path,
			`data-theme="${requested}" names a Theme this build does not ship (${themes.join(", ")}).`,
		),
	]
}

/** Every built page asks for a Theme this build ships, and the published CSS defines that Theme. */
export function checkThemeAttribute(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
	themes: readonly string[],
): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) =>
		checkPage(file.path, scanHtml(file.content), tokens, themes),
	)
}
