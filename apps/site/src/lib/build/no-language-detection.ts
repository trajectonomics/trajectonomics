import type { BuiltFile } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"
import { builtHomes } from "./language-home"

/** An inline script: the only kind a Locale page could run to choose a Language for the visitor. */
const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

/** What a script would read to choose a Language: the browser's own, a cookie, or storage. */
const DETECTION = /\b(?:navigator\.languages?|localStorage|sessionStorage|document\.cookie)\b/

/** The body of every inline script in a page. */
function inlineScripts(html: string): readonly string[] {
	return [...html.matchAll(INLINE_SCRIPT)].map((match) => match[1] ?? "")
}

/** A Locale URL is its Language already, so nothing on it reads a Visitor signal ([ADR 0003]). */
export function checkNoLanguageDetection(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return builtHomes(files)
		.filter(({ file }) => inlineScripts(file.content).some((body) => DETECTION.test(body)))
		.map(({ file }) =>
			buildFailure(
				"SCRIPT_DETECTS_LANGUAGE",
				file.path,
				"runs a script that reads the browser's Language, a cookie or storage; a Locale URL is the Language already.",
			),
		)
}
