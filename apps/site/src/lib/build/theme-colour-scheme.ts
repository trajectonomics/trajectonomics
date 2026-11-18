import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { pageStylesheets } from "./page-stylesheets"
import { pageUrl } from "./page-url"

/** The declaration that makes the browser's own chrome follow one Theme, whatever the device asks for. */
function statesScheme(theme: string): RegExp {
	return new RegExp(`color-scheme\\s*:\\s*(?:only\\s+)?${theme}\\b`, "i")
}

/** Every Theme a page paints is one its stylesheet states a `color-scheme` for, which no `data-theme` can express. */
export function checkThemeColourScheme(
	files: readonly BuiltFile[],
	themes: readonly string[],
): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => {
		const sheets = pageStylesheets(files, file).files
		const missing = themes.filter(
			(theme) => !sheets.some((sheet) => statesScheme(theme).test(sheet.content)),
		)
		if (missing.length === 0) return []
		const owed = missing.map((theme) => `\`color-scheme: ${theme}\``).join(" or ")
		return [
			buildFailure(
				"THEME_COLOUR_SCHEME_MISSING",
				pageUrl(file.path),
				`the stylesheet this page loads states no ${owed}, so the browser's own scrollbars do not follow the page.`,
			),
		]
	})
}
