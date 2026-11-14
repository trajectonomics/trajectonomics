import type { Dictionary } from "../language/dictionary"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

/** The first element of one tag after `from` in document order. */
function nextAfter(page: ScannedPage, from: HtmlElement, tag: string): HtmlElement | undefined {
	return page.elements.slice(page.elements.indexOf(from) + 1).find((element) => element.tag === tag)
}

/** The footer carries the owner's disclaimer, the one paragraph that also carries the tax wording. */
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

/** The hero's headline, the phrases it cycles, and its sub-line, as the Dictionary writes them. */
function heroFailures(
	file: BuiltFile,
	page: ScannedPage,
	dictionary: Dictionary,
): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	const hero = elementsByTag(page, "h1").find((heading) =>
		heading.ancestors.some((ancestor) => ancestor.tag === "main"),
	)
	const text = hero === undefined ? "" : textOf(page, hero)
	const missing = [dictionary.heroHeadingPrefix, ...dictionary.heroHeadingCycle].find(
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
	if (subline === undefined || textOf(page, subline) !== dictionary.heroSubline) {
		failures.push(
			buildFailure(
				"SUBLINE_NOT_RENDERED",
				file.path,
				`no paragraph under the headline shows "${dictionary.heroSubline}".`,
			),
		)
	}
	return failures
}

/** Every Language home renders its headline, its sub-line and its footer's owner text. */
export function checkPageText(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const page = scanHtml(file.content)
		return [
			...heroFailures(file, page, entry.dictionary),
			...footerFailures(file, page, entry.dictionary),
		]
	})
}
