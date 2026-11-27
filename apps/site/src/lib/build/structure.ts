import { LANGUAGES } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { builtPages } from "./built-files"
import type { BuildFailure, BuildFailureCode } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml } from "./html"
import { pageUrl } from "./page-url"

/** The Language codes that are no Language build path, so no page may be built under one. */
const CODES_WITHOUT_A_PATH: ReadonlySet<string> = new Set(
	LANGUAGES.filter((entry) => entry.buildPath !== entry.language).map((entry) => entry.language),
)

/** The elements a page carries exactly one of: one head, one body, and one set of landmarks. */
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

/** No page is written under a directory named after a Language code that is no build path. */
function checkLanguageDirectories(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return files.flatMap((file) => {
		const [directory] = file.path.split("/")
		if (directory === undefined || !CODES_WITHOUT_A_PATH.has(directory)) return []
		return [
			buildFailure(
				"LANGUAGE_CODE_DIRECTORY_PRESENT",
				pageUrl(file.path),
				`is built under ${directory}/, which is no Language build path; the Site's one address is /.`,
			),
		]
	})
}

/** Every built page carries exactly one `head`, `body`, `nav`, `main` and `h1`. */
export function checkStructure(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [
		...checkLanguageDirectories(files),
		...builtPages(files).flatMap((file) => checkSingleElements(file)),
	]
}
