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

/** Every page shows one header, one hero inside main, and one footer. */
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
		return failures
	})
}
