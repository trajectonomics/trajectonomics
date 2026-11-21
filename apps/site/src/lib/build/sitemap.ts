import { SITEMAP_FILE } from "../crawl/sitemap"
import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { entryAlternateFailures } from "./sitemap-alternates"
import { type SitemapEntry, sitemapEntries } from "./sitemap-entry"

/** The Site's one address, as the Sitemap's `<loc>` path. */
const CLEAN_PATH = "/"

/** Every entry whose `<loc>` names a path the Site does not serve. */
function unknownFailures(entries: readonly SitemapEntry[]): readonly BuildFailure[] {
	return entries
		.filter((entry) => entry.path !== CLEAN_PATH)
		.map((entry) =>
			buildFailure(
				"SITEMAP_URL_UNKNOWN",
				SITEMAP_FILE,
				`an entry names ${entry.loc || "no <loc>"}, which is not the Site's address.`,
			),
		)
}

/** The Sitemap lists the Site's one address exactly once, at its absolute URL. */
function cleanUrlFailures(entries: readonly SitemapEntry[]): readonly BuildFailure[] {
	const matching = entries.filter((entry) => entry.path === CLEAN_PATH)
	if (matching.length === 0) {
		return [
			buildFailure(
				"SITEMAP_URL_MISSING",
				SITEMAP_FILE,
				`the Sitemap lists no <url> for ${CLEAN_PATH}.`,
			),
		]
	}
	if (matching.length > 1) {
		return [
			buildFailure(
				"SITEMAP_URL_DUPLICATE",
				SITEMAP_FILE,
				`the Sitemap lists ${matching.length} <url> entries for ${CLEAN_PATH}, not one.`,
			),
		]
	}
	if (matching[0]?.loc === ABSOLUTE_CLEAN_URL) return []
	return [
		buildFailure(
			"SITEMAP_LOC_TARGET",
			SITEMAP_FILE,
			`the entry at ${CLEAN_PATH} names ${matching[0]?.loc || "no <loc>"}, not ${ABSOLUTE_CLEAN_URL}.`,
		),
	]
}

/** Every rule the Sitemap breaks: one `<url>` at the Site's one address, naming `x-default`. */
export function checkSitemap(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, SITEMAP_FILE)
	if (file === undefined) {
		return [buildFailure("SITEMAP_MISSING", SITEMAP_FILE, "the build produced no Sitemap.")]
	}
	const entries = sitemapEntries(file.content)
	return [
		...unknownFailures(entries),
		...cleanUrlFailures(entries),
		...entries.flatMap((entry) =>
			entry.path === CLEAN_PATH ? entryAlternateFailures(entry, CLEAN_PATH) : [],
		),
	]
}
