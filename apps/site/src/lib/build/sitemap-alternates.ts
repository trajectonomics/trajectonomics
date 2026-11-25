import { SITEMAP_FILE } from "../crawl/sitemap"
import { LANGUAGES } from "../language/languages"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import type { HtmlElement } from "./html"
import type { SitemapEntry } from "./sitemap-entry"

/** One alternate is present once, and its `href` is the entry's own address. */
function defaultFailures(
	home: string,
	url: string,
	alternates: readonly HtmlElement[],
): readonly BuildFailure[] {
	const matching = alternates.filter((link) => link.attributes["hreflang"] === "x-default")
	if (matching.length === 0) {
		return [
			buildFailure(
				"SITEMAP_ALTERNATE_MISSING",
				SITEMAP_FILE,
				`the entry at ${home} names no x-default alternate.`,
			),
		]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"SITEMAP_ALTERNATE_DUPLICATE",
				SITEMAP_FILE,
				`the entry at ${home} names ${matching.length} x-default alternates, not one.`,
			),
		]
	}
	const target = matching[0]?.attributes["href"]
	if (target === url) return []
	return [
		buildFailure(
			"SITEMAP_ALTERNATE_TARGET",
			SITEMAP_FILE,
			`the entry at ${home} names x-default at ${target ?? "no href"}, not ${url}.`,
		),
	]
}

/** No entry names a per-Language alternate: one address leaves no second URL to list. */
function languageAlternateFailures(
	home: string,
	alternates: readonly HtmlElement[],
): readonly BuildFailure[] {
	return LANGUAGES.filter((entry) =>
		alternates.some((link) => link.attributes["hreflang"] === entry.language),
	).map((entry) =>
		buildFailure(
			"SITEMAP_ALTERNATE_LANGUAGE",
			SITEMAP_FILE,
			`the entry at ${home} names a ${entry.language} alternate, but each page has one address.`,
		),
	)
}

/** An entry names one `x-default` at its own address, and no per-Language alternate. */
export function entryAlternateFailures(
	entry: SitemapEntry,
	home: string,
	url: string,
): readonly BuildFailure[] {
	return [
		...defaultFailures(home, url, entry.alternates),
		...languageAlternateFailures(home, entry.alternates),
	]
}
