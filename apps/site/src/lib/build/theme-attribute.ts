import type { DesignTokens } from "../design/tokens"
import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type ScannedPage, scanHtml } from "./html"

/** The Theme the markup falls back to when JavaScript never runs. */
const FALLBACK_THEME = "light"

/** The page asks for a published Theme, and that Theme is the one it falls back to. */
function checkPage(path: string, page: ScannedPage, tokens: DesignTokens): readonly BuildFailure[] {
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
	const failures: BuildFailure[] = []
	const published = tokens.themes.map((theme) => theme.name).join(", ")
	if (!tokens.themes.some((theme) => theme.name === requested)) {
		failures.push(
			buildFailure(
				"THEME_ATTRIBUTE_NOT_PUBLISHED",
				path,
				`data-theme="${requested}" names no Theme the published CSS defines (${published}).`,
			),
		)
	}
	if (requested !== FALLBACK_THEME) {
		failures.push(
			buildFailure(
				"THEME_FALLBACK_NOT_LIGHT",
				path,
				`data-theme="${requested}"; with JavaScript off the page falls back to ${FALLBACK_THEME}.`,
			),
		)
	}
	return failures
}

/** Every built page asks for a published Theme, and falls back to the light one. */
export function checkThemeAttribute(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => checkPage(file.path, scanHtml(file.content), tokens))
}
