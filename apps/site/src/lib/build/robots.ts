import { ROBOTS_FILE, ROBOTS_SITEMAPS } from "../crawl/robots"
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

/** The file carries no `Disallow:`, because it speaks for the whole host and other Workers serve under it. */
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

/** Every Sitemap is named at the absolute URL the build serves it from, and no other is. */
function sitemapFailures(parsed: ParsedRobots): readonly BuildFailure[] {
	const sitemaps = parsed.directives.filter((directive) => directive.field === "sitemap")
	const missing = ROBOTS_SITEMAPS.filter(
		(url) => !sitemaps.some((sitemap) => sitemap.value === url),
	).map((url) => buildFailure("ROBOTS_SITEMAP_MISSING", ROBOTS_FILE, `names no Sitemap at ${url}.`))
	const unknown = sitemaps
		.filter((sitemap) => !ROBOTS_SITEMAPS.includes(sitemap.value))
		.map((one) =>
			buildFailure(
				"ROBOTS_SITEMAP_TARGET",
				ROBOTS_FILE,
				`names the Sitemap at ${one.value || "nothing"}, which is no Sitemap of this host.`,
			),
		)
	return [...missing, ...unknown]
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
