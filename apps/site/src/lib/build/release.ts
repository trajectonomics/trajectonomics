import { LLMS_FULL_FILE } from "../crawl/llms-full"
import type { Dictionary } from "../language/dictionary"
import { dictionaryFor, languageEntry } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { builtLanguagePages } from "./language-pages"
import { NOT_FOUND_PAGES } from "./not-found-pages"
import { footerFailures } from "./release-footer"
import { versionFailures } from "./release-version"

/** A file the rules judge, with the Dictionary whose release strings it must print, if it has a footer. */
interface CoveredPage {
	readonly file: BuiltFile
	readonly dictionary: Dictionary | undefined
}

/** Every page the build writes, the Not-found page and the full Answer engine file, as it wrote them. */
function coveredPages(files: readonly BuiltFile[]): readonly CoveredPage[] {
	const pages = builtLanguagePages(files).map(({ page, file }) => ({
		file,
		dictionary: dictionaryFor(page.language),
	}))
	const notFound = NOT_FOUND_PAGES.flatMap((page) => {
		const file = fileAt(files, page.path)
		return file === undefined ? [] : [{ file, dictionary: languageEntry(page.language).dictionary }]
	})
	const full = fileAt(files, LLMS_FULL_FILE)
	return [
		...pages,
		...notFound,
		...(full === undefined ? [] : [{ file: full, dictionary: undefined }]),
	]
}

/** Every covered page names the Release snapshot's version, its release line and its release day. */
export function checkReleaseFacts(files: readonly BuiltFile[]): readonly BuildFailure[] {
	// A page with no footer is left to the landmark rule, which owns that failure.
	return coveredPages(files).flatMap(({ file, dictionary }) => [
		...versionFailures(file),
		...(dictionary === undefined ? [] : footerFailures(file, dictionary)),
	])
}
