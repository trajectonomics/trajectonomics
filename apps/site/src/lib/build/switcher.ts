import { currentLanguageName } from "../language/dictionary"
import type { Language } from "../language/language"
import { dictionaryFor, localeUrl, otherLanguages } from "../language/languages"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

/** The switcher on one home: one ordinary link per other Language, named in that Language. */
function checkSwitcherFor(file: BuiltFile, language: Language): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	const anchors = elementsByTag(page, "a")
	const failures = otherLanguages(language).flatMap((other) => {
		const href = localeUrl(other.language)
		const code = other.language
		const link = anchors.find(
			(anchor) =>
				anchor.attributes["href"] === href &&
				anchor.attributes["lang"] === code &&
				anchor.attributes["hreflang"] === code,
		)
		if (link === undefined) {
			return [
				buildFailure(
					"SWITCHER_MISSING",
					file.path,
					`has no <a href="${href}" lang="${code}" hreflang="${code}">, so the other Language is not one click and not script-free.`,
				),
			]
		}
		const name = dictionaryFor(other.language).languageName
		const text = textOf(page, link)
		if (text === name) return []
		return [
			buildFailure(
				"SWITCHER_TEXT_WRONG",
				file.path,
				`labels ${href} "${text}", not "${name}", which is that Language's own name.`,
			),
		]
	})
	const entry = dictionaryFor(language)
	const current = anchors.find(
		(anchor) =>
			anchor.attributes["href"] === localeUrl(language) &&
			anchor.attributes["aria-current"] === "page",
	)
	if (current === undefined) {
		return [
			...failures,
			buildFailure(
				"SWITCHER_CURRENT_MISSING",
				file.path,
				`no link marks ${localeUrl(language)} as the current Language.`,
			),
		]
	}
	const named = current.attributes["aria-label"] === currentLanguageName(entry)
	const labelled = textOf(page, current) === entry.languageName
	if (named && labelled) return failures
	return [
		...failures,
		buildFailure(
			"SWITCHER_CURRENT_LABEL_WRONG",
			file.path,
			`the current link should show "${entry.languageName}" and be named "${currentLanguageName(entry)}".`,
		),
	]
}

/** A home switches to every other Language with a plain link, with JavaScript off ([ADR 0003]). */
export function checkSwitcher(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => checkSwitcherFor(file, entry.language))
}
