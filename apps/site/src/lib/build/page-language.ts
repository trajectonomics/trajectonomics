import type { Language } from "../language/language"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"

/** The Language a built page declares in `<html lang>`, or `undefined` when it declares none. */
export function declaredLanguage(html: string): string | undefined {
	const [element] = elementsByTag(scanHtml(html), "html")
	return element?.attributes["lang"]
}

/** A page must declare the Language of the Locale URL it is served at, in `<html lang>`. */
export function checkDeclaredLanguage(
	file: BuiltFile,
	language: Language,
): readonly BuildFailure[] {
	const declared = declaredLanguage(file.content)
	if (declared?.toLowerCase() === language) return []
	return [
		buildFailure(
			"LANGUAGE_NOT_DECLARED",
			file.path,
			`declares <html lang="${declared ?? ""}">, not "${language}"; the browser breaks and speaks lines by it.`,
		),
	]
}
