import { ROBOTS_FILE } from "../crawl/robots"
import { SITEMAP_URL } from "../crawl/sitemap"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** One `field: value` directive of the Robots file, its field lowercased because the format's are. */
interface Directive {
	readonly field: string
	readonly value: string
}

/** A line's directive, or nothing for a comment, a blank line and a line that names no field. */
function directiveOf(line: string): readonly Directive[] {
	const text = (line.split("#")[0] ?? "").trim()
	const colon = text.indexOf(":")
	if (colon <= 0) return []
	return [
		{
			field: text.slice(0, colon).trim().toLowerCase(),
			value: text.slice(colon + 1).trim(),
		},
	]
}

/** Every directive of a Robots file, in the order it states them. */
function directivesOf(content: string): readonly Directive[] {
	return content.split(/\r?\n/).flatMap(directiveOf)
}

/** Whether the file states `field: value`, with `value` compared as written. */
function states(directives: readonly Directive[], field: string, value: string): boolean {
	return directives.some((one) => one.field === field && one.value === value)
}

/** The rules the Robots file keeps, and the failures a file that breaks them earns. */
function rules(directives: readonly Directive[]): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	if (!states(directives, "user-agent", "*")) {
		failures.push(
			buildFailure(
				"ROBOTS_AGENT_MISSING",
				ROBOTS_FILE,
				"states no `User-agent: *`, so it addresses no agent.",
			),
		)
	}
	if (!states(directives, "allow", "/")) {
		failures.push(
			buildFailure("ROBOTS_ALLOW_MISSING", ROBOTS_FILE, "allows no `/`, so it opens no page."),
		)
	}
	for (const one of directives.filter((directive) => directive.field === "disallow")) {
		failures.push(
			buildFailure(
				"ROBOTS_DISALLOW_PRESENT",
				ROBOTS_FILE,
				`carries \`Disallow: ${one.value}\`, and this file speaks for the whole host.`,
			),
		)
	}
	const sitemaps = directives.filter((directive) => directive.field === "sitemap")
	if (sitemaps.length === 0) {
		failures.push(
			buildFailure("ROBOTS_SITEMAP_MISSING", ROBOTS_FILE, "names no Sitemap for a crawler."),
		)
	}
	for (const one of sitemaps.filter((sitemap) => sitemap.value !== SITEMAP_URL)) {
		failures.push(
			buildFailure(
				"ROBOTS_SITEMAP_TARGET",
				ROBOTS_FILE,
				`names the Sitemap at ${one.value || "nothing"}, not ${SITEMAP_URL}.`,
			),
		)
	}
	return failures
}

/** Every rule the Robots file breaks: every agent may read every path, and the Sitemap is named. */
export function checkRobots(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, ROBOTS_FILE)
	if (file === undefined) {
		return [buildFailure("ROBOTS_MISSING", ROBOTS_FILE, "the build produced no Robots file.")]
	}
	return rules(directivesOf(file.content))
}
