import type { BuiltFile } from "./built-files"
import { builtPages, fileAt } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"

/** The path no document may be built at, because `/` redirects to a Locale URL ([ADR 0003]). */
const ROOT_DOCUMENT = "index.html"

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

/** Every built page carries exactly one `head`, `body`, `nav` and `main`, and `/` has no document. */
export function checkStructure(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const failures: BuildFailure[] = []
	if (fileAt(files, ROOT_DOCUMENT) !== undefined) {
		failures.push(
			buildFailure(
				"ROOT_DOCUMENT_PRESENT",
				ROOT_DOCUMENT,
				"the build has a document at /; / redirects to a Locale URL and serves no page.",
			),
		)
	}
	for (const file of builtPages(files)) failures.push(...checkSingleElements(file))
	return failures
}
