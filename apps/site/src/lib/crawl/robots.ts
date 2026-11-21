import { SITEMAP_URL } from "./sitemap"

/** The Robots file's built path, relative to the Worker's assets root. */
export const ROBOTS_FILE = "robots.txt"

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
 * The Robots file: every agent may read every path, the Sitemap is named, and each answer engine
 * gets a group of its own. It carries no `Disallow:`. `/docs` on this host is the redirect to the
 * Docs Portal, so disallowing it would hide that redirect from crawlers.
 */
export const ROBOTS = `User-agent: *
Allow: /

${NAMED_AGENTS.map(namedGroup).join("\n\n")}

Sitemap: ${SITEMAP_URL}
`
