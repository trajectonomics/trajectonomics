import { sameColour } from "../design/colour"
import { type DesignTokens, parseDesignTokens, type Theme } from "../design/tokens"
import { type BuiltFile, builtPages, fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { isStylesheetLink, type ScannedPage, scanHtml } from "./html"

/** The built files the page's stylesheet links load: the CSS that can paint it. */
function linkedStylesheets(page: ScannedPage, files: readonly BuiltFile[]): readonly BuiltFile[] {
	return page.elements.filter(isStylesheetLink).flatMap((element) => {
		const href = element.attributes["href"]
		if (href === undefined) return []
		const file = fileAt(files, href.replace(/^\.?\//, ""))
		return file === undefined ? [] : [file]
	})
}

/** The roles a Theme defines, in the CSS the page loads, at a value the published CSS does not. */
function unpublishedRoles(theme: Theme, built: readonly Theme[]): readonly string[] {
	const declared = built.filter((found) => found.name === theme.name)
	return Object.entries(theme.colours)
		.filter(([role, value]) =>
			declared.every((found) => !sameColour(found.colours[role] ?? "", value)),
		)
		.map(([role]) => `--ds-color-${role}`)
}

/** A few names for a failure message, so a whole missing Theme does not print one line of 19 roles. */
function listNames(names: readonly string[]): string {
	const shown = names.slice(0, 4).join(", ")
	return names.length <= 4 ? shown : `${shown} and ${names.length - 4} more`
}

/** The stylesheet a page loads carries every published Theme at the published values. */
export function checkThemeCss(
	files: readonly BuiltFile[],
	tokens: DesignTokens,
): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => {
		const sheets = linkedStylesheets(scanHtml(file.content), files)
		const built = parseDesignTokens({
			themes: sheets.map((sheet) => sheet.content),
			tailwind: "",
		}).themes
		return tokens.themes.flatMap((theme) => {
			const unpublished = unpublishedRoles(theme, built)
			if (unpublished.length === 0) return []
			return [
				buildFailure(
					"THEME_CSS_NOT_BUILT",
					file.path,
					`the stylesheet this page loads does not carry [data-theme="${theme.name}"] at the published values: ${listNames(unpublished)}.`,
				),
			]
		})
	})
}
