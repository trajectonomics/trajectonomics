import type { BuiltFile } from "./built-files"
import { builtPages } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"

/** One rule: a page shows this element, and the count of them the page must have. */
const LANDMARKS = [
	{ tag: "header", count: 1, code: "HEADER_MISSING" },
	{ tag: "footer", count: 1, code: "FOOTER_MISSING" },
] as const satisfies readonly { tag: string; count: number; code: BuildFailureCode }[]

/** The headings a page may not carry at any depth: one claim, then one section at most. */
const DEEP_HEADINGS = ["h3", "h4", "h5", "h6"] as const

/** One rule: the page's single section heading may be an `h2` inside `main`, and nowhere else. */
function sectionFailures(path: string, page: ReturnType<typeof scanHtml>): readonly BuildFailure[] {
	const sections = elementsByTag(page, "h2")
	if (sections.length === 0) return []
	const inside = sections.filter((heading) =>
		heading.ancestors.some((ancestor) => ancestor.tag === "main"),
	)
	if (sections.length === 1 && inside.length === 1) return []
	const reason =
		sections.length > 1
			? `expected at most one <h2>, found ${sections.length}.`
			: "the <h2> is outside <main>."
	return [buildFailure("HEADING_H2_NOT_ALLOWED", path, reason)]
}

/** One rule: no `h3`–`h6` anywhere, because the page keeps one claim and one section. */
function deepHeadingFailures(
	path: string,
	page: ReturnType<typeof scanHtml>,
): readonly BuildFailure[] {
	const [deep] = DEEP_HEADINGS.flatMap((tag) => elementsByTag(page, tag))
	if (deep === undefined) return []
	return [buildFailure("HEADING_TOO_DEEP", path, `expected no <h3>–<h6>, found <${deep.tag}>.`)]
}

/** Every page shows one header, one hero inside main, at most one section heading, and one footer. */
export function checkLandmarks(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtPages(files).flatMap((file) => {
		const page = scanHtml(file.content)
		const failures = LANDMARKS.flatMap((landmark) => {
			const found = elementsByTag(page, landmark.tag).length
			if (found === landmark.count) return []
			return [
				buildFailure(
					landmark.code,
					file.path,
					`expected ${landmark.count} <${landmark.tag}>, found ${found}.`,
				),
			]
		})
		const heroes = elementsByTag(page, "h1").filter((heading) =>
			heading.ancestors.some((ancestor) => ancestor.tag === "main"),
		)
		if (heroes.length !== 1) {
			failures.push(
				buildFailure(
					"HERO_MISSING",
					file.path,
					`expected one <h1> inside <main> for the hero, found ${heroes.length}.`,
				),
			)
		}
		failures.push(...sectionFailures(file.path, page), ...deepHeadingFailures(file.path, page))
		return failures
	})
}
