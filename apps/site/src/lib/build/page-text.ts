import type { Dictionary } from "../language/dictionary"
import type { LanguagePage } from "../language/language-pages"
import { dictionaryFor } from "../language/languages"
import { openJotDictionaryFor } from "../language/openjot-dictionary"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtLanguagePages } from "./language-pages"

/** The words a page's hero states, which both pages' dictionaries carry under the same names. */
type HeroWords = Pick<Dictionary, "heroHeadingPrefix" | "heroHeadingAccent" | "heroSubline">

/** The first element of one tag after `from` in document order. */
function nextAfter(page: ScannedPage, from: HtmlElement, tag: string): HtmlElement | undefined {
	return page.elements.slice(page.elements.indexOf(from) + 1).find((element) => element.tag === tag)
}

/** The footer carries the Site's disclaimer, the one paragraph that also carries the tax wording. */
function footerFailures(
	file: BuiltFile,
	page: ScannedPage,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	const footer = elementsByTag(page, "footer")[0]
	const disclaimer = footer === undefined ? undefined : nextAfter(page, footer, "p")
	if (disclaimer !== undefined && textOf(page, disclaimer) === dictionary.footerDisclaimer)
		return []
	return [
		buildFailure(
			"DISCLAIMER_NOT_RENDERED",
			file.path,
			`the footer's first paragraph does not show "${dictionary.footerDisclaimer}".`,
		),
	]
}

/** The hero's headline (its plain run and its accent) and its sub-line, as the page's Dictionary writes them. */
function heroFailures(
	file: BuiltFile,
	page: ScannedPage,
	words: HeroWords,
): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	const hero = elementsByTag(page, "h1").find((heading) =>
		heading.ancestors.some((ancestor) => ancestor.tag === "main"),
	)
	const text = hero === undefined ? "" : textOf(page, hero)
	const missing = [words.heroHeadingPrefix, words.heroHeadingAccent].find(
		(headline) => !text.includes(headline),
	)
	if (missing !== undefined) {
		failures.push(
			buildFailure(
				"HEADLINE_NOT_RENDERED",
				file.path,
				`the hero's <h1> does not show "${missing}".`,
			),
		)
	}
	const subline = hero === undefined ? undefined : nextAfter(page, hero, "p")
	if (subline === undefined || textOf(page, subline) !== words.heroSubline) {
		failures.push(
			buildFailure(
				"SUBLINE_NOT_RENDERED",
				file.path,
				`no paragraph under the headline shows "${words.heroSubline}".`,
			),
		)
	}
	return failures
}

/** The words one page's hero states, from the Dictionary its own kind draws. */
function heroWordsOf(page: LanguagePage): HeroWords {
	if (page.kind === "home") return dictionaryFor(page.language)
	const dictionary = openJotDictionaryFor(page.language)
	return {
		heroHeadingPrefix: dictionary.heroHeadingPrefix,
		heroHeadingAccent: dictionary.heroHeadingAccent,
		heroSubline: dictionary.heroLede,
	}
}

/** Every page renders its headline, its sub-line and its footer's owner text. */
export function checkPageText(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ page, file }) => {
		const scanned = scanHtml(file.content)
		return [
			...heroFailures(file, scanned, heroWordsOf(page)),
			...footerFailures(file, scanned, dictionaryFor(page.language)),
		]
	})
}
