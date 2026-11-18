import type { Language } from "../../language/language"
import { FALLBACK_LANGUAGE } from "../../language/language"
import { absoluteLocaleUrl, LANGUAGES } from "../../language/languages"
import { SITE_ORIGIN } from "../../site"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"

/** The `xhtml:link` an entry carries for one `hreflang`, self-closed as the Sitemap writes it. */
function alternate(hreflang: string, href: string): string {
	return `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`
}

/** The `<url>` a healthy Sitemap carries for one Language's home, naming every alternate. */
export function sitemapEntry(language: Language): string {
	const alternates = [
		...LANGUAGES.map((entry) => alternate(entry.language, absoluteLocaleUrl(entry.language))),
		alternate("x-default", absoluteLocaleUrl(FALLBACK_LANGUAGE)),
	].join("\n")
	return `  <url>\n    <loc>${absoluteLocaleUrl(language)}</loc>\n${alternates}\n  </url>`
}

/** The Sitemap a healthy build writes: one `<url>` per Language home, in `LANGUAGES` order. */
export const HEALTHY_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGUAGES.map((entry) => sitemapEntry(entry.language)).join("\n")}
</urlset>
`

/**
 * The Robots file a healthy build writes: every agent, every path, the Sitemap named, and a group of
 * its own for each answer engine the crawler policy invites.
 */
export const HEALTHY_ROBOTS = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: CCBot
Allow: /

User-agent: Bytespider
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`

/** Both Crawler files as the build must write them, with any given file standing in for one. */
export function crawlFiles(...replace: readonly BuiltFile[]): readonly BuiltFile[] {
	const healthy: readonly BuiltFile[] = [
		{ path: "sitemap.xml", content: HEALTHY_SITEMAP },
		{ path: "robots.txt", content: HEALTHY_ROBOTS },
	]
	return healthy.map((file) => replace.find((given) => given.path === file.path) ?? file)
}

/** The Crawler files with one part of the file at `path` replaced. */
export function edited(path: string, pattern: RegExp, replacement: string): readonly BuiltFile[] {
	const file = crawlFiles().find((candidate) => candidate.path === path)
	if (file === undefined) throw new Error(`the build writes no ${path}`)
	return crawlFiles({ path, content: file.content.replace(pattern, replacement) })
}

/** The failure codes one check reports for the built Crawler files, `files` standing in for both. */
export function codes(
	check: (files: readonly BuiltFile[]) => readonly BuildFailure[],
	files: readonly BuiltFile[] = crawlFiles(),
): readonly string[] {
	return check(files).map((failure) => failure.code)
}
