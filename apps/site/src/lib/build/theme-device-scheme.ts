import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { scanHtml, scriptElements } from "./html"
import { pageStylesheets } from "./page-stylesheets"
import { pageUrl } from "./page-url"

/** What a device asks a browser for with `prefers-color-scheme`; a production build never reads it ([ADR 0016]). */
const DEVICE_SCHEME = /prefers-color-scheme/i

/** One place a device query can hide, named as a failure message names it, with the text read there. */
type Place = readonly [where: string, text: string]

/** The attribute text of a page, because a device query can sit on any element of the markup. */
function attributeText(content: string): string {
	return scanHtml(content)
		.elements.map((element) => Object.values(element.attributes).join(" "))
		.join(" ")
}

/** Every place of one page a device query could hide: its markup, its scripts and the sheets it loads. */
function places(file: BuiltFile, files: readonly BuiltFile[]): readonly Place[] {
	const scripts = scriptElements(file.content).map(
		(script): Place => ["a script it runs", script.body],
	)
	const sheets = pageStylesheets(files, file).files.map(
		(sheet): Place => [`the stylesheet ${sheet.path}`, sheet.content],
	)
	return [["its markup", attributeText(file.content)], ...scripts, ...sheets]
}

/**
 * No built page, and no stylesheet a page loads, names the device scheme, in the build that forces one
 * Theme: a build that ships both asks the device on purpose ([ADR 0016]).
 */
export function checkThemeDeviceScheme(
	files: readonly BuiltFile[],
	themes: readonly string[],
): readonly BuildFailure[] {
	if (themes.length > 1) return []
	return builtPages(files).flatMap((file) =>
		places(file, files)
			.filter(([, text]) => DEVICE_SCHEME.test(text))
			.map(([where]) =>
				buildFailure(
					"THEME_DEVICE_SCHEME_PRESENT",
					pageUrl(file.path),
					`names prefers-color-scheme in ${where}, so the device would choose the Theme.`,
				),
			),
	)
}
