import type { ContentFile } from "./content-pages"
import { OPERATOR_TAB_CONTENT } from "./tabs"

/** An Operator-tab page that links a design record (ADR 0014). */
export interface AdrLinkProblem {
	readonly rule: "adr-link"
	readonly file: string
	readonly detail: string
}

/** A Markdown link whose target has an `adr/` path segment: a design record, written for contributors. */
const ADR_LINK = /\[([^\]]*)\]\(([^)\s]*\/adr\/[^)\s]*)\)/g

/** Every design-record link in `file`; empty outside the Operator tab, whose readers are contributors. */
function linkProblems(file: ContentFile): readonly AdrLinkProblem[] {
	if (!file.path.startsWith(`${OPERATOR_TAB_CONTENT}/`)) return []
	return [...file.content.matchAll(ADR_LINK)].map((match) => ({
		rule: "adr-link",
		file: file.path,
		detail: `links a design record: [${(match[1] ?? "").replace(/\s+/g, " ")}](${match[2]})`,
	}))
}

/** Every Operator-tab page that links a design record; empty when the pages speak to the reader alone. */
export function checkAdrLinks(files: readonly ContentFile[]): readonly AdrLinkProblem[] {
	return files.flatMap(linkProblems)
}
