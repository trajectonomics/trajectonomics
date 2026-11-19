import { SITEMAP_FILE } from "../crawl/sitemap"
import type { Language } from "../language/language"
import { absoluteLocaleUrl, LANGUAGES, localeUrl } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { entryAlternateFailures } from "./sitemap-alternates"
import { type SitemapEntry, sitemapEntries } from "./sitemap-entry"

/** Every entry whose `<loc>` names a path no Language serves. */
function unknownFailures(
	entries: readonly SitemapEntry[],
	homes: readonly string[],
): readonly BuildFailure[] {
	return entries
		.filter((entry) => entry.path === undefined || !homes.includes(entry.path))
		.map((entry) =>
			buildFailure(
				"SITEMAP_URL_UNKNOWN",
				SITEMAP_FILE,
				`an entry names ${entry.loc || "no <loc>"}, which is no Language's home.`,
			),
		)
}

/** One Language's home is listed once, at that home's absolute Locale URL. */
function homeFailures(
	entries: readonly SitemapEntry[],
	language: Language,
): readonly BuildFailure[] {
	const path = localeUrl(language)
	const matching = entries.filter((entry) => entry.path === path)
	if (matching.length === 0) {
		return [
			buildFailure("SITEMAP_URL_MISSING", SITEMAP_FILE, `the Sitemap lists no <url> for ${path}.`),
		]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"SITEMAP_URL_DUPLICATE",
				SITEMAP_FILE,
				`the Sitemap lists ${matching.length} <url> entries for ${path}, not one.`,
			),
		]
	}
	const href = absoluteLocaleUrl(language)
	if (matching[0]?.loc === href) return []
	return [
		buildFailure(
			"SITEMAP_LOC_TARGET",
			SITEMAP_FILE,
			`the entry at ${path} names ${matching[0]?.loc || "no <loc>"}, not ${href}.`,
		),
	]
}

/** Every rule the Sitemap breaks: one `<url>` per Language home, and every alternate on each. */
export function checkSitemap(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, SITEMAP_FILE)
	if (file === undefined) {
		return [buildFailure("SITEMAP_MISSING", SITEMAP_FILE, "the build produced no Sitemap.")]
	}
	const entries = sitemapEntries(file.content)
	const homes = LANGUAGES.map((language) => localeUrl(language.language))
	return [
		...unknownFailures(entries, homes),
		...LANGUAGES.flatMap((language) => homeFailures(entries, language.language)),
		...entries.flatMap((entry) => {
			const path = entry.path
			return path !== undefined && homes.includes(path) ? entryAlternateFailures(entry, path) : []
		}),
	]
}
