import { SITEMAP_FILE, SITEMAP_PAGES, type SitemapPage } from "../crawl/sitemap"
import { languagePages } from "../language/language-pages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { entryAlternateFailures } from "./sitemap-alternates"
import { type SitemapEntry, sitemapEntries } from "./sitemap-entry"

/** The addresses the Site serves, each once: both Languages' pages reduce to the same address. */
function knownPages(): readonly SitemapPage[] {
	const byAddress = new Map<string, SitemapPage>()
	for (const page of languagePages()) {
		byAddress.set(page.address, { path: page.address, url: page.absoluteUrl })
	}
	return [...byAddress.values()]
}

/** Every entry whose `<loc>` names a path the Site does not serve. */
function unknownFailures(entries: readonly SitemapEntry[]): readonly BuildFailure[] {
	const known = new Set(knownPages().map((page) => page.path))
	return entries
		.filter((entry) => entry.path === undefined || !known.has(entry.path))
		.map((entry) =>
			buildFailure(
				"SITEMAP_URL_UNKNOWN",
				SITEMAP_FILE,
				`an entry names ${entry.loc || "no <loc>"}, which is not an address the Site serves.`,
			),
		)
}

/** One address is listed exactly once, at its absolute URL. */
function pageFailures(
	entries: readonly SitemapEntry[],
	page: SitemapPage,
): readonly BuildFailure[] {
	const matching = entries.filter((entry) => entry.path === page.path)
	if (matching.length === 0) {
		return [
			buildFailure(
				"SITEMAP_URL_MISSING",
				SITEMAP_FILE,
				`the Sitemap lists no <url> for ${page.path}.`,
			),
		]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"SITEMAP_URL_DUPLICATE",
				SITEMAP_FILE,
				`the Sitemap lists ${matching.length} <url> entries for ${page.path}, not one.`,
			),
		]
	}
	const [entry] = matching
	if (entry?.loc !== page.url) {
		return [
			buildFailure(
				"SITEMAP_LOC_TARGET",
				SITEMAP_FILE,
				`the entry at ${page.path} names ${entry?.loc || "no <loc>"}, not ${page.url}.`,
			),
		]
	}
	return entryAlternateFailures(entry, page.path, page.url)
}

/** Every entry a rule breaks, plus the builds that omit a page or list it twice. */
export function checkSitemap(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, SITEMAP_FILE)
	if (file === undefined) {
		return [buildFailure("SITEMAP_MISSING", SITEMAP_FILE, "the build produced no Sitemap.")]
	}
	const entries = sitemapEntries(file.content)
	return [
		...unknownFailures(entries),
		...SITEMAP_PAGES.flatMap((page) => pageFailures(entries, page)),
	]
}
