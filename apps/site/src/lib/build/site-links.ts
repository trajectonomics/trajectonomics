import type { Dictionary } from "../language/dictionary"
import type { Language } from "../language/language"
import { localeUrl } from "../language/languages"
import { CLI_LICENCE_URL, GITHUB_CLI_URL, GITHUB_ORG_URL, SITE_NAME } from "../site"
import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, type HtmlElement, type ScannedPage, scanHtml, textOf } from "./html"
import { builtHomes } from "./language-home"

interface ExpectedLink {
	readonly text: string
	readonly href: string
}

/** The named links the hero and footer show; the Docs and cli links are pinned by `checkPageLinks`. */
function expectedLinks(dictionary: Dictionary): readonly ExpectedLink[] {
	return [
		{ text: dictionary.starOnGitHub, href: GITHUB_CLI_URL },
		{ text: dictionary.licence, href: CLI_LICENCE_URL },
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

/** The wordmark is the accessible name trajectonomics, and it links the Language's home. */
function wordmarkFailures(
	path: string,
	links: readonly HtmlElement[],
	language: Language,
): readonly BuildFailure[] {
	const wordmark = links.find((link) => link.attributes["aria-label"] === SITE_NAME)
	if (wordmark === undefined) {
		return [
			buildFailure(
				"WORDMARK_MISSING",
				path,
				`no link carries the wordmark's accessible name ${SITE_NAME}.`,
			),
		]
	}
	if (wordmark.attributes["href"] === localeUrl(language)) return []
	return [
		buildFailure(
			"WORDMARK_HREF_MISMATCH",
			path,
			`the wordmark goes to ${wordmark.attributes["href"] ?? "nowhere"}, not ${localeUrl(language)}.`,
		),
	]
}

/** Every named link and the wordmark of every Language home goes where it says. */
export function checkSiteLinks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files).flatMap(({ entry, file }) => {
		const scanned = scanHtml(file.content)
		const links = elementsByTag(scanned, "a")
		return [
			...namedLinkFailures(file.path, scanned, links, entry.dictionary),
			...wordmarkFailures(file.path, links, entry.language),
		]
	})
}
