import { LLMS_FILE } from "../crawl/llms"
import { LLMS_FULL_FILE } from "../crawl/llms-full"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { ABSOLUTE_CLEAN_URL, LANGUAGES } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** Both Answer engine files, at the assets root a crawler or an agent reads them from. */
export const LLMS_FILES: readonly string[] = Object.freeze([LLMS_FILE, LLMS_FULL_FILE])

/** The link a healthy file writes to the Site's address, as the file's Markdown carries it. */
const CLEAN_LINK = `](${ABSOLUTE_CLEAN_URL})`

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

/** The short file links the Site's one address, and no Language's build path. */
function homeFailures(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, LLMS_FILE)
	if (file === undefined) return []
	const failures: BuildFailure[] = []
	if (!file.content.includes(CLEAN_LINK)) {
		failures.push(
			buildFailure(
				"LLMS_HOME_MISSING",
				LLMS_FILE,
				`links no ${ABSOLUTE_CLEAN_URL}, so a reader reaches no home.`,
			),
		)
	}
	return [
		...failures,
		...LANGUAGES.filter((entry) => entry.buildPath !== "").flatMap((entry) => {
			const link = `](${SITE_ORIGIN}/${entry.buildPath}/)`
			if (!file.content.includes(link)) return []
			return [
				buildFailure(
					"LLMS_BUILD_PATH_PRESENT",
					LLMS_FILE,
					`links ${SITE_ORIGIN}/${entry.buildPath}/, which is a build path and not the Site's address.`,
				),
			]
		}),
	]
}

/** Both Answer engine files are in the build, link the one address, and carry only the owner's words. */
export function checkLlmsFiles(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [...LLMS_FILES.flatMap((name) => presenceFailures(files, name)), ...homeFailures(files)]
}
