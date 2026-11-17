import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import { localeUrl } from "../language/languages"
import { GITHUB_ORG_URL, GITHUB_SKILLS_URL, SITE_NAME, SKILLS_LICENCE_URL } from "../site"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

interface ExpectedLink {
	readonly text: string
	readonly href: string
}

/** The named links the How it works section and footer show; the Docs and skills links are pinned by `checkPageLinks`. */
function expectedLinks(dictionary: Dictionary): readonly ExpectedLink[] {
	return [
		{ text: dictionary.starOnboarding, href: GITHUB_SKILLS_URL },
		{ text: dictionary.licence, href: SKILLS_LICENCE_URL },
		{ text: dictionary.org, href: GITHUB_ORG_URL },
	]
}

/** The link whose visible text is exactly `text`, or `undefined` when the page shows none. */
function linkShowing(
	links: readonly HtmlElement[],
	page: ScannedPage,
	text: string,
): HtmlElement | undefined {
	return links.find((link) => textOf(page, link) === text)
}

/** Each named link is present and goes where the region promises. */
function namedLinkFailures(
	path: string,
	page: ScannedPage,
	links: readonly HtmlElement[],
	dictionary: Dictionary,
): readonly BuildFailure[] {
	return expectedLinks(dictionary).flatMap((expected) => {
		const link = linkShowing(links, page, expected.text)
		if (link === undefined) {
			return [buildFailure("LINK_MISSING", path, `no link shows "${expected.text}".`)]
		}
		if (link.attributes["href"] === expected.href) return []
		return [
			buildFailure(
				"LINK_HREF_MISMATCH",
				path,
				`the "${expected.text}" link goes to ${link.attributes["href"] ?? "nowhere"}, not ${expected.href}.`,
			),
		]
	})
}

/** The brand lockup is the accessible name trajectonomics, and it links the Language's home. */
function brandFailures(
	path: string,
	links: readonly HtmlElement[],
	language: Language,
): readonly BuildFailure[] {
	const brand = links.find((link) => link.attributes["aria-label"] === SITE_NAME)
	if (brand === undefined) {
		return [
			buildFailure(
				"WORDMARK_MISSING",
				path,
				`no link carries the brand lockup's accessible name ${SITE_NAME}.`,
			),
		]
	}
	if (brand.attributes["href"] === localeUrl(language)) return []
	return [
		buildFailure(
			"WORDMARK_HREF_MISMATCH",
			path,
			`the brand lockup goes to ${brand.attributes["href"] ?? "nowhere"}, not ${localeUrl(language)}.`,
		),
	]
}

/** Every named link and the brand lockup of every Language home goes where it says. */
export function checkSiteLinks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const scanned = scanHtml(file.content)
		const links = elementsByTag(scanned, "a")
		return [
			...namedLinkFailures(file.path, scanned, links, entry.dictionary),
			...brandFailures(file.path, links, entry.language),
		]
	})
}
