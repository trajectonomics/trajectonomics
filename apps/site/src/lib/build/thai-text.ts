import { type BuiltFile, builtPages } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { elementsByTag, scanHtml, type TextRun } from "./html"
import { parseAttributes } from "./html-tag"
import { pageUrl } from "./page-url"

const THAI_SCRIPT = /[\u0E00-\u0E7F]/
const TITLE = /<title\b([^>]*)>([\s\S]*?)<\/title>/gi

/** The Language a text run inherits: the nearest ancestor that declares one. */
function languageOf(run: TextRun): string | undefined {
	const declared = [...run.ancestors]
		.reverse()
		.find((ancestor) => ancestor.attributes["lang"] !== undefined)
	return declared?.attributes["lang"]
}

/** Whether a declared Language is Thai, or a Thai variant such as `th-TH`. */
function speaksThai(language: string | undefined): boolean {
	return (language ?? "").toLowerCase().startsWith("th")
}

/** The Language a title's Thai text inherits: its own `lang`, else the document's. */
function titleLanguage(attributes: string, page: ReturnType<typeof scanHtml>): string | undefined {
	const own = parseAttributes(attributes)["lang"]
	if (own !== undefined) return own
	return elementsByTag(page, "html")[0]?.attributes["lang"]
}

/** The first Thai text of a built page whose nearest declared Language is not Thai. */
function unmarkedThaiOf(file: BuiltFile): string | undefined {
	const page = scanHtml(file.content)
	const run = page.text.find(
		(candidate) => THAI_SCRIPT.test(candidate.text) && !speaksThai(languageOf(candidate)),
	)
	if (run !== undefined) return run.text.trim()
	for (const match of file.content.matchAll(TITLE)) {
		const text = match[2] ?? ""
		if (THAI_SCRIPT.test(text) && !speaksThai(titleLanguage(match[1] ?? "", page))) {
			return text.trim()
		}
	}
	return undefined
}

/** Thai text is spoken correctly only when the Language it inherits is Thai, `html` included. */
function failuresOf(file: BuiltFile): readonly BuildFailure[] {
	const unmarked = unmarkedThaiOf(file)
	if (unmarked === undefined) return []
	return [
		buildFailure(
			"THAI_TEXT_LANGUAGE_WRONG",
			pageUrl(file.path),
			`Thai text "${unmarked.slice(0, 40)}" inherits no ancestor whose lang starts with "th".`,
		),
	]
}

/** Every run of Thai script on a built page inherits a Language that is Thai. */
export function checkThaiTextLanguage(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtPages(files).flatMap(failuresOf)
}
