import { SITEMAP } from "../../crawl/sitemap"
import { ABSOLUTE_CLEAN_URL } from "../../language/languages"
import { SITE_ORIGIN } from "../../site"
import type { BuiltFile } from "../built-files"
import type { BuildFailure } from "../failures"

/** The `<url>` a healthy Sitemap carries, naming `x-default` at the Site's one address. */
export const sitemapEntry = `  <url>
    <loc>${ABSOLUTE_CLEAN_URL}</loc>
    <xhtml:link rel="alternate" hreflang="x-default" href="${ABSOLUTE_CLEAN_URL}" />
  </url>`

/** The Sitemap a healthy build writes: one `<url>` per page address. */
export const HEALTHY_SITEMAP = SITEMAP

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
