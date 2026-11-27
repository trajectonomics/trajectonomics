import { BLOG_SITEMAP_URL, DOCS_SITEMAP_URL } from "../site"
import { OPENJOT_COMPARISON_SITEMAP_URL } from "../site/openjot"
import { SITEMAP_URL } from "./sitemap"

/** The Robots file's built path, relative to the Worker's assets root. */
export const ROBOTS_FILE = "robots.txt"

/**
 * The Sitemaps the file names, in the order it states them: the Site's own, then the Docs Portal's, the
 * blog's and the OpenJot comparison page's, which zone routes mount on this host (ADR 0033).
 */
export const ROBOTS_SITEMAPS: readonly string[] = Object.freeze([
	SITEMAP_URL,
	DOCS_SITEMAP_URL,
	BLOG_SITEMAP_URL,
	OPENJOT_COMPARISON_SITEMAP_URL,
])

/**
 * The answer engines and crawlers the file names one `Allow: /` group each. Every one of them is
 * already allowed by `*`, so the behaviour is the same; the groups state the intent, because the
 * project is free and open source and wants the answers it publishes to be read.
 */
export const NAMED_AGENTS: readonly string[] = Object.freeze([
	"GPTBot",
	"OAI-SearchBot",
	"ChatGPT-User",
	"ClaudeBot",
	"Claude-SearchBot",
	"PerplexityBot",
	"Google-Extended",
	"Applebot-Extended",
	"CCBot",
	"Bytespider",
])

/** One named agent's own group: the agent, and the one `Allow` the wildcard group states. */
function namedGroup(agent: string): string {
	return `User-agent: ${agent}\nAllow: /`
}

/**
 * The Robots file: every agent may read every path, every Sitemap is named, and each answer engine
 * gets a group of its own. It carries no `Disallow:`, because it speaks for the whole host: `/docs`,
 * `/blog` and `/data` are other Workers mounted beside the Site, and a `Disallow:` would shut them out.
 */
export const ROBOTS = `User-agent: *
Allow: /

${NAMED_AGENTS.map(namedGroup).join("\n\n")}

${ROBOTS_SITEMAPS.map((url) => `Sitemap: ${url}`).join("\n")}
`
