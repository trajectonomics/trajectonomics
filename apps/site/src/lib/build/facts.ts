import type { Dictionary } from "../language/dictionary"
import { languageEntry } from "../language/languages"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtLanguagePages } from "./language-pages"

/** The attribute that marks a page's strip of facts, which belongs to its footer. */
const FACTS = "data-facts"

/** The landmark the facts belong to: the footer, with the rest of the fine print. */
const FOOTER = "footer"

/** The strip of facts one page carries, when it carries one at all. */
function stripIn(page: ScannedPage): HtmlElement | undefined {
	return page.elements.find((element) => FACTS in element.attributes)
}

/** The footer one page shows, when it shows one. */
function footerIn(page: ScannedPage): HtmlElement | undefined {
	return page.elements.find((element) => element.tag === FOOTER)
}

/** Every string the strip states: each fact's label and its text, in the Dictionary's order. */
function stated(dictionary: Dictionary): readonly string[] {
	return [...dictionary.factLabels, ...dictionary.factTexts]
}

/** A page that carries no strip of facts at all. */
function missingStrip(file: BuiltFile, dictionary: Dictionary): BuildFailure {
	return buildFailure(
		"PAGE_FACTS_MISSING",
		file.path,
		`the page carries no facts for the footer: "${stated(dictionary).join('", "')}".`,
	)
}

/** Every label or text the strip leaves out, so no fact reaches a visitor half-written. */
function unstatedFacts(
	file: BuiltFile,
	page: ScannedPage,
	strip: HtmlElement,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	const shown = textOf(page, strip)
	return stated(dictionary).flatMap((fact) =>
		shown.includes(fact)
			? []
			: [
					buildFailure(
						"FACT_NOT_STATED",
						file.path,
						`the facts in the footer do not state "${fact}".`,
					),
				],
	)
}

/** The facts sit in the footer, with the fine print, and not in the hero (site#69). */
function placementFailures(
	file: BuiltFile,
	page: ScannedPage,
	strip: HtmlElement,
): readonly BuildFailure[] {
	const footer = footerIn(page)
	if (footer === undefined || strip.ancestors.includes(footer)) return []
	return [
		buildFailure(
			"PAGE_FACTS_NOT_IN_FOOTER",
			file.path,
			"the facts sit outside the footer; they belong with the footer's fine print.",
		),
	]
}

/** Every page states the Site's three plain facts in its footer (site#69). */
export function checkFacts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtLanguagePages(files).flatMap(({ page: words, file }) => {
		const dictionary = languageEntry(words.language).dictionary
		const page = scanHtml(file.content)
		const strip = stripIn(page)
		if (strip === undefined) return [missingStrip(file, dictionary)]
		return [
			...unstatedFacts(file, page, strip, dictionary),
			...placementFailures(file, page, strip),
		]
	})
}
