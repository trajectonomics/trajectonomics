import { LLMS_FILE } from "../crawl/llms"
import { LLMS_FULL_FILE } from "../crawl/llms-full"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { absoluteLocaleUrl, LANGUAGES } from "../language/languages"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** Both Answer engine files, at the assets root a crawler or an agent reads them from. */
export const LLMS_FILES: readonly string[] = Object.freeze([LLMS_FILE, LLMS_FULL_FILE])

/** One file exists, and carries no text the owner has not written yet. */
function presenceFailures(files: readonly BuiltFile[], name: string): readonly BuildFailure[] {
	const file = fileAt(files, name)
	if (file === undefined) {
		return [buildFailure("LLMS_FILE_MISSING", name, `the build produced no ${name}.`)]
	}
	if (!file.content.includes(OWNER_WRITTEN_PLACEHOLDER)) return []
	return [
		buildFailure(
			"LLMS_PLACEHOLDER_PRESENT",
			name,
			`still contains "${OWNER_WRITTEN_PLACEHOLDER}"; an answer engine would read text the owner has not written.`,
		),
	]
}

/** The short file names every Language home, so a reader can reach the Site in either Language. */
function homeFailures(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, LLMS_FILE)
	if (file === undefined) return []
	return LANGUAGES.filter((entry) => !file.content.includes(absoluteLocaleUrl(entry.language))).map(
		(entry) =>
			buildFailure(
				"LLMS_HOME_MISSING",
				LLMS_FILE,
				`names no ${absoluteLocaleUrl(entry.language)}, so a reader reaches only part of the Site.`,
			),
	)
}

/** Both Answer engine files are in the build, name every home, and carry only the owner's words. */
export function checkLlmsFiles(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [...LLMS_FILES.flatMap((name) => presenceFailures(files, name)), ...homeFailures(files)]
}
