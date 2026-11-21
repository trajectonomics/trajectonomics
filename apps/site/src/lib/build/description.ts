import type { Language } from "../language/language"
import { dictionaryFor } from "../language/languages"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type ScannedPage, scanHtml } from "./html"
import { unescapeText } from "./html-tag"
import { builtHomes } from "./language-home"
import { pageUrl } from "./page-url"

/** The `name` a description meta carries, whatever case the build writes it in. */
const DESCRIPTION = "description"

/** The content of every description meta on a page, in document order, its escaping undone. */
function descriptionsOf(page: ScannedPage): readonly string[] {
	return elementsByTag(page, "meta")
		.filter((meta) => meta.attributes["name"]?.toLowerCase() === DESCRIPTION)
		.map((meta) => unescapeText(meta.attributes["content"] ?? ""))
}

/** One Language home summarises itself once, in the words the Dictionary states for that Language. */
function failuresOf(file: BuiltFile, language: Language): readonly BuildFailure[] {
	const path = pageUrl(file.path)
	const descriptions = descriptionsOf(scanHtml(file.content))
	const [description] = descriptions
	if (description === undefined) {
		return [
			buildFailure(
				"DESCRIPTION_MISSING",
				path,
				"carries no description, so a search result shows no summary line.",
			),
		]
	}
	if (descriptions.length > 1) {
		return [
			buildFailure(
				"DESCRIPTION_DUPLICATE",
				path,
				`carries ${descriptions.length} descriptions, not one.`,
			),
		]
	}
	const expected = dictionaryFor(language).description
	if (description === expected) return []
	return [
		buildFailure(
			"DESCRIPTION_TEXT_WRONG",
			path,
			`describes itself "${description}", not "${expected}".`,
		),
	]
}

/** Every Language home describes itself in the one description the Dictionary states. */
export function checkDescription(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => failuresOf(file, entry.language))
}
