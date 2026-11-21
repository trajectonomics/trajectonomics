import { ROBOTS_FILE } from "../crawl/robots"
import { SITEMAP_URL } from "../crawl/sitemap"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { allowsRoot, groupOf } from "./robots-directives"
import { namedAgentFailures } from "./robots-named"
import type { ParsedRobots } from "./robots-parse"
import { parseRobots } from "./robots-parse"

/** The wildcard group allows every path, so no agent the file leaves unnamed is shut out. */
function wildcardFailures(parsed: ParsedRobots): readonly BuildFailure[] {
	const group = groupOf(parsed, "*")
	if (group === undefined) {
		return [
			buildFailure(
				"ROBOTS_AGENT_MISSING",
				ROBOTS_FILE,
				"states no `User-agent: *`, so it addresses no agent.",
			),
		]
	}
	if (allowsRoot(group)) return []
	return [
		buildFailure(
			"ROBOTS_ALLOW_MISSING",
			ROBOTS_FILE,
			"allows no `/` to `User-agent: *`, so it opens no page.",
		),
	]
}

/** The file carries no `Disallow:`, because it is read at the host root and speaks for `/docs` too. */
function disallowFailures(parsed: ParsedRobots): readonly BuildFailure[] {
	return parsed.directives
		.filter((directive) => directive.field === "disallow")
		.map((one) =>
			buildFailure(
				"ROBOTS_DISALLOW_PRESENT",
				ROBOTS_FILE,
				`carries \`Disallow: ${one.value}\`, and this file speaks for the whole host.`,
			),
		)
}

/** The Sitemap is named, once, at the absolute URL the build serves it from. */
function sitemapFailures(parsed: ParsedRobots): readonly BuildFailure[] {
	const sitemaps = parsed.directives.filter((directive) => directive.field === "sitemap")
	if (sitemaps.length === 0) {
		return [buildFailure("ROBOTS_SITEMAP_MISSING", ROBOTS_FILE, "names no Sitemap for a crawler.")]
	}
	return sitemaps
		.filter((sitemap) => sitemap.value !== SITEMAP_URL)
		.map((one) =>
			buildFailure(
				"ROBOTS_SITEMAP_TARGET",
				ROBOTS_FILE,
				`names the Sitemap at ${one.value || "nothing"}, not ${SITEMAP_URL}.`,
			),
		)
}

/** Every rule the Robots file breaks: every agent may read every path, and the Sitemap is named. */
export function checkRobots(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, ROBOTS_FILE)
	if (file === undefined) {
		return [buildFailure("ROBOTS_MISSING", ROBOTS_FILE, "the build produced no Robots file.")]
	}
	const parsed = parseRobots(file.content)
	return [
		...wildcardFailures(parsed),
		...disallowFailures(parsed),
		...sitemapFailures(parsed),
		...namedAgentFailures(parsed),
	]
}
