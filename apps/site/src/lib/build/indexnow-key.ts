import { INDEXNOW_KEY, INDEXNOW_KEY_FILE } from "../crawl/indexnow"
import type { BuiltFile } from "./built-files"
import { fileAt } from "./built-files"
import type { BuildFailure } from "./failures"
import { buildFailure } from "./failures"

/**
 * The IndexNow key file is in the build, and states the key and nothing else. The endpoint fetches it
 * from the Site before it accepts a submission, so a file the build dropped refuses every ping.
 */
export function checkIndexNowKey(files: readonly BuiltFile[]): readonly BuildFailure[] {
	const file = fileAt(files, INDEXNOW_KEY_FILE)
	if (file === undefined) {
		return [
			buildFailure(
				"INDEXNOW_KEY_FILE_MISSING",
				INDEXNOW_KEY_FILE,
				`the build produced no ${INDEXNOW_KEY_FILE}, so IndexNow cannot verify the host.`,
			),
		]
	}
	if (file.content.trim() === INDEXNOW_KEY) return []
	return [
		buildFailure(
			"INDEXNOW_KEY_FILE_WRONG",
			INDEXNOW_KEY_FILE,
			`states ${JSON.stringify(file.content)}, not the key alone.`,
		),
	]
}
