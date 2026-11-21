import type { ContentFile } from "./content-pages"
import { OPERATOR_TAB_CONTENT } from "./tabs"

/** An Operator-tab page that links a design record (ADR 0014). */
export interface AdrLinkProblem {
	readonly rule: "adr-link"
	readonly file: string
	readonly detail: string
}

/**
 * A path or URL with an `adr/` segment, wherever the page writes it: an inline link with or without
 * a title, a reference definition, an autolink, a bare URL, an HTML anchor or the `adr` folder itself. Matching the path
 * rather than the link syntax keeps every form a page can link with inside the check.
 */
const ADR_PATH =
	/(?<![\w-])(?:(?:[^\s()<>"'[\]]*\/)?adr\/[^\s()<>"'[\]]*|[^\s()<>"'[\]]*\/adr(?![\w-]))/gi

/** Every design-record path in `file`; empty outside the Operator tab, whose readers are contributors. */
function linkProblems(file: ContentFile): readonly AdrLinkProblem[] {
	if (!file.path.startsWith(`${OPERATOR_TAB_CONTENT}/`)) return []
	return [...file.content.matchAll(ADR_PATH)].map((match) => ({
		rule: "adr-link",
		file: file.path,
		detail: `links a design record: ${match[0]}`,
	}))
}

/** Every Operator-tab page that links a design record; empty when the pages speak to the reader alone. */
export function checkAdrLinks(files: readonly ContentFile[]): readonly AdrLinkProblem[] {
	return files.flatMap(linkProblems)
}
