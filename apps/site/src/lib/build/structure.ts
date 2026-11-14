import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"

/** Both pages the router mounts, at their paths in the assets root. */
const INDEX_PAGE = "index.html"
const NOT_FOUND_PAGE = "404.html"

/** The elements the router needs exactly one of on every page. */
const SINGLE_ELEMENTS = [
	{ tag: "head", code: "HEAD_NOT_SINGLE" },
	{ tag: "body", code: "BODY_NOT_SINGLE" },
	{ tag: "nav", code: "NAV_NOT_SINGLE" },
	{ tag: "main", code: "MAIN_NOT_SINGLE" },
] as const satisfies readonly { tag: string; code: BuildFailureCode }[]

/** The number of opening `<tag>` elements in `html`; a closing tag never adds one. */
function countElements(html: string, tag: string): number {
	return html.match(new RegExp(`<${tag}\\b`, "gi"))?.length ?? 0
}

function checkSingleElements(file: BuiltFile): readonly BuildFailure[] {
	return SINGLE_ELEMENTS.flatMap((rule) => {
		const count = countElements(file.content, rule.tag)
		if (count === 1) return []
		return [
			buildFailure(
				rule.code,
				file.path,
				`expected exactly one <${rule.tag}>, found ${count}; the router injects onto one of each.`,
			),
		]
	})
}

/** Every page must carry exactly one `head`, `body`, `nav` and `main` ([ADR 0002]). */
export function checkStructure(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	const index = fileAt(files, INDEX_PAGE)
	const notFound = fileAt(files, NOT_FOUND_PAGE)
	if (index === undefined) {
		failures.push(
			buildFailure(
				"INDEX_PAGE_MISSING",
				INDEX_PAGE,
				"the build has no index page at the assets root.",
			),
		)
	}
	if (notFound === undefined) {
		failures.push(
			buildFailure(
				"NOT_FOUND_PAGE_MISSING",
				NOT_FOUND_PAGE,
				"the build has no 404.html at the assets root, so the Worker has no Not-found page.",
			),
		)
	}
	for (const page of [index, notFound]) {
		if (page !== undefined) failures.push(...checkSingleElements(page))
	}
	return failures
}
