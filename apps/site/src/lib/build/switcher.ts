import { currentLanguageName } from "../language/dictionary"
import type { LanguagePage } from "../language/language-pages"
import { dictionaryFor, languageChoiceLink, otherLanguages } from "../language/languages"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml, textOf } from "./html"
import { builtLanguagePages } from "./language-pages"

/** One page's switcher: one Language choice link per other Language, named in that Language. */
function checkSwitcherFor(file: BuiltFile, page: LanguagePage): readonly BuildFailure[] {
	const scanned = scanHtml(file.content)
	const anchors = elementsByTag(scanned, "a")
	const failures = otherLanguages(page.language).flatMap((other) => {
		const href = languageChoiceLink(other.language, page.address)
		const code = other.language
		const link = anchors.find(
			(anchor) => anchor.attributes["href"] === href && anchor.attributes["lang"] === code,
		)
		if (link === undefined) {
			return [
				buildFailure(
					"SWITCHER_MISSING",
					file.path,
					`has no <a href="${href}" lang="${code}">, so the other Language is not one click and not script-free.`,
				),
			]
		}
		if (link.attributes["hreflang"] !== undefined) {
			return [
				buildFailure(
					"SWITCHER_CLAIMS_HREFLANG",
					file.path,
					`marks ${href} as a Language alternate, but a Language choice link is not one.`,
				),
			]
		}
		const name = dictionaryFor(other.language).languageName
		const text = textOf(scanned, link)
		if (text === name) return []
		return [
			buildFailure(
				"SWITCHER_TEXT_WRONG",
				file.path,
				`labels ${href} "${text}", not "${name}", which is that Language's own name.`,
			),
		]
	})
	const entry = dictionaryFor(page.language)
	const current = anchors.find(
		(anchor) =>
			anchor.attributes["href"] === languageChoiceLink(page.language, page.address) &&
			anchor.attributes["aria-current"] === "page",
	)
	if (current === undefined) {
		return [
			...failures,
			buildFailure(
				"SWITCHER_CURRENT_MISSING",
				file.path,
				`no link marks ${languageChoiceLink(page.language, page.address)} as the current Language.`,
			),
		]
	}
	const named = current.attributes["aria-label"] === currentLanguageName(entry)
	const labelled = textOf(scanned, current) === entry.languageName
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

/** Every page switches to every other Language with a plain Language choice link (ADR 0020). */
export function checkSwitcher(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ page, file }) => checkSwitcherFor(file, page))
}
