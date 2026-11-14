import type { BuiltFile } from "./built-files"
import { builtPages, fileAt } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The path no document may be built at, because `/` redirects to a Locale URL ([ADR 0003]). */
const ROOT_DOCUMENT = "index.html"

/** The elements a page carries exactly one of: the router injects onto the landmarks, and a page has one title. */
const SINGLE_ELEMENTS = [
	{ tag: "head", code: "HEAD_NOT_SINGLE" },
	{ tag: "body", code: "BODY_NOT_SINGLE" },
	{ tag: "nav", code: "PAGE_NAV_COUNT" },
	{ tag: "main", code: "PAGE_MAIN_COUNT" },
	{ tag: "h1", code: "PAGE_H1_COUNT" },
] as const satisfies readonly { tag: string; code: BuildFailureCode }[]

/** Every one-count rule a page breaks, so one page can name more than its first broken landmark. */
function checkSingleElements(file: BuiltFile): readonly BuildFailure[] {
	const page = scanHtml(file.content)
	return SINGLE_ELEMENTS.flatMap((rule) => {
		const count = elementsByTag(page, rule.tag).length
		if (count === 1) return []
		return [
			buildFailure(
				rule.code,
				pageUrl(file.path),
				`expected exactly one <${rule.tag}>, found ${count}.`,
			),
		]
	})
}

/** Every built page carries exactly one `head`, `body`, `nav`, `main` and `h1`, and `/` has no document. */
export function checkStructure(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	if (fileAt(files, ROOT_DOCUMENT) !== undefined) {
		failures.push(
			buildFailure(
				"ROOT_DOCUMENT_PRESENT",
				pageUrl(ROOT_DOCUMENT),
				"the build has a document at /; / redirects to a Locale URL and serves no page.",
			),
		)
	}
	for (const file of builtPages(files)) failures.push(...checkSingleElements(file))
	return failures
}
