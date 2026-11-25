import { LLMS_FILE } from "../crawl/llms"
import { LLMS_FULL_FILE } from "../crawl/llms-full"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { ABSOLUTE_CLEAN_URL, LANGUAGES, languageBuildUrl } from "../language/languages"
import { ABSOLUTE_OPENJOT_URL } from "../site/openjot"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/** Both Answer engine files, at the assets root a crawler or an agent reads them from. */
export const LLMS_FILES: readonly string[] = Object.freeze([LLMS_FILE, LLMS_FULL_FILE])

/** The link a healthy file writes to the Site's address, as the file's Markdown carries it. */
const CLEAN_LINK = `](${ABSOLUTE_CLEAN_URL})`

/** The link a healthy file writes to the OpenJot page, which is one of the Site's addresses now. */
const OPENJOT_LINK = `](${ABSOLUTE_OPENJOT_URL})`

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

/** Every Answer engine file links the Site's one address, and no Language's build path. */
function homeFailures(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return LLMS_FILES.flatMap((name) => {
		const file = fileAt(files, name)
		if (file === undefined) return []
		const missing = file.content.includes(CLEAN_LINK)
			? []
			: [
					buildFailure(
						"LLMS_HOME_MISSING",
						name,
						`links no ${ABSOLUTE_CLEAN_URL}, so a reader reaches no home.`,
					),
				]
		const openJot = file.content.includes(OPENJOT_LINK)
			? []
			: [
					buildFailure(
						"LLMS_OPENJOT_MISSING",
						name,
						`links no ${ABSOLUTE_OPENJOT_URL}, so a reader reaches no OpenJot page.`,
					),
				]
		const buildPaths = LANGUAGES.filter((entry) => entry.buildPath !== "").flatMap((entry) => {
			const link = `](${languageBuildUrl(entry.language)})`
			if (!file.content.includes(link)) return []
			return [
				buildFailure(
					"LLMS_BUILD_PATH_PRESENT",
					name,
					`links ${languageBuildUrl(entry.language)}, which is a build path and not the Site's address.`,
				),
			]
		})
		return [...missing, ...openJot, ...buildPaths]
	})
}

/** Both Answer engine files are in the build, link the one address, and carry only the owner's words. */
export function checkLlmsFiles(files: readonly BuiltFile[]): readonly BuildFailure[] {
	return [...LLMS_FILES.flatMap((name) => presenceFailures(files, name)), ...homeFailures(files)]
}
