import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { isDataBlockType, scriptElements } from "./html"
import { builtHomes } from "./language-home"

/** What a script would read to choose a Language: the browser's own, a cookie, or storage. */
const DETECTION = /\b(?:navigator\.languages?|localStorage|sessionStorage|document\.cookie)\b/

/** The body of every inline script in a page, leaving out a data block and a loaded file. */
function inlineScripts(html: string): readonly string[] {
	return scriptElements(html).flatMap((element) => {
		if (element.attributes["src"] !== undefined) return []
		if (isDataBlockType(element.attributes["type"])) return []
		return [element.body]
	})
}

/** The server resolves the Language, so no page script reads a Visitor signal or the choice (ADR 0020). */
export function checkNoLanguageDetection(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files)
		.filter(({ file }) => inlineScripts(file.content).some((body) => DETECTION.test(body)))
		.map(({ file }) =>
			buildFailure(
				"SCRIPT_DETECTS_LANGUAGE",
				file.path,
				"runs a script that reads the browser's Language, a cookie or storage; the Worker resolves the Language, so a page script must not.",
			),
		)
}
